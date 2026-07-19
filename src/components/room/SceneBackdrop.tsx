import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { LightingMode } from '../../store/roomStore';

type Rgb = [number, number, number];

const WIDTH = 128;
const HEIGHT = 256;

function hexToRgb(hex: string): Rgb {
  return [Number.parseInt(hex.slice(1, 3), 16), Number.parseInt(hex.slice(3, 5), 16), Number.parseInt(hex.slice(5, 7), 16)];
}

function mix(a: Rgb, b: Rgb, amount: number): Rgb {
  const t = THREE.MathUtils.clamp(amount, 0, 1);
  return [
    Math.round(THREE.MathUtils.lerp(a[0], b[0], t)),
    Math.round(THREE.MathUtils.lerp(a[1], b[1], t)),
    Math.round(THREE.MathUtils.lerp(a[2], b[2], t)),
  ];
}

function addTint(base: Rgb, tint: Rgb, amount: number) {
  return mix(base, tint, THREE.MathUtils.clamp(amount, 0, 0.92));
}

function softEllipse(x: number, y: number, cx: number, cy: number, rx: number, ry: number) {
  const distance = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
  return Math.exp(-distance * 2.3);
}

function buildBackdropTexture(lighting: LightingMode) {
  const isWarm = lighting === 'warm';
  const top = hexToRgb(isWarm ? '#7C9B97' : '#A8DED4');
  const middle = hexToRgb(isWarm ? '#E5A56F' : '#F7D6AD');
  const bottom = hexToRgb(isWarm ? '#B95E49' : '#E99A68');
  const cloud = hexToRgb(isWarm ? '#FFE2B7' : '#FFFBEA');
  const sun = hexToRgb(isWarm ? '#FFC46D' : '#FFF0B0');
  const pixels = new Uint8Array(WIDTH * HEIGHT * 4);

  for (let py = 0; py < HEIGHT; py += 1) {
    const y = py / (HEIGHT - 1);
    for (let px = 0; px < WIDTH; px += 1) {
      const x = px / (WIDTH - 1);
      let color = y < 0.54 ? mix(top, middle, y / 0.54) : mix(middle, bottom, (y - 0.54) / 0.46);

      const sunGlow = softEllipse(x, y, 0.5, 0.39, 0.34, 0.18) * (isWarm ? 0.23 : 0.2);
      const horizonGlow = Math.exp(-(((y - 0.76) / 0.14) ** 2)) * 0.13;
      color = addTint(color, sun, sunGlow + horizonGlow);

      const upperCloud =
        softEllipse(x, y, -0.04, 0.18, 0.35, 0.055) +
        softEllipse(x, y, 0.16, 0.16, 0.25, 0.07) +
        softEllipse(x, y, 1.03, 0.28, 0.42, 0.068) +
        softEllipse(x, y, 0.81, 0.25, 0.24, 0.05);
      const lowerCloud =
        softEllipse(x, y, -0.1, 0.7, 0.33, 0.055) +
        softEllipse(x, y, 1.04, 0.64, 0.38, 0.06);
      color = addTint(color, cloud, Math.min(0.42, upperCloud * 0.21 + lowerCloud * 0.1));

      const offset = (py * WIDTH + px) * 4;
      pixels[offset] = color[0];
      pixels[offset + 1] = color[1];
      pixels[offset + 2] = color[2];
      pixels[offset + 3] = 255;
    }
  }

  const texture = new THREE.DataTexture(pixels, WIDTH, HEIGHT, THREE.RGBAFormat, THREE.UnsignedByteType);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.flipY = true;
  texture.needsUpdate = true;
  return texture;
}

export function SceneBackdrop({ lighting }: { lighting: LightingMode }) {
  const texture = useMemo(() => buildBackdropTexture(lighting), [lighting]);

  useEffect(() => {
    return () => texture.dispose();
  }, [texture]);

  return <primitive attach="background" object={texture} />;
}
