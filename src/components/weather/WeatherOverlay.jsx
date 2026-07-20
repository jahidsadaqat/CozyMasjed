'use dom';

import { useEffect, useRef } from "react";
import useWeatherAmbience from "./useWeatherAmbience";

/**
 * WeatherOverlay — alle 5 tilstande
 * Lægges OVER 3D-scenen, UNDER UI'et (Add / Style / Snap).
 *
 *   <WeatherOverlay mode={weather} />
 *
 * mode: "sunny" | "cloudy" | "rain" | "wind" | "night" | null
 *
 * Alt tegnes i én <canvas> — ingen DOM-noder pr. partikel.
 * OBS: Selve himlens farve skal appen selv skifte (baggrunds-gradient
 * eller scene-belysning). Canvas'et lægger kun effekter og slør ovenpå.
 *
 * @param {{
 *   mode?: "sunny" | "cloudy" | "rain" | "wind" | "night" | null,
 *   soundOn?: boolean,
 *   dom?: import("expo/dom").DOMProps,
 * }} props
 */
export default function WeatherOverlay({ mode = null, soundOn = false, dom }) {
  const canvasRef = useRef(null);
  const modeRef = useRef(mode);
  modeRef.current = mode;

  useWeatherAmbience(mode, soundOn);
  void dom;

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const previous = {
      htmlMargin: html.style.margin,
      htmlPadding: html.style.padding,
      htmlWidth: html.style.width,
      htmlHeight: html.style.height,
      htmlOverflow: html.style.overflow,
      htmlBackground: html.style.background,
      bodyMargin: body.style.margin,
      bodyPadding: body.style.padding,
      bodyWidth: body.style.width,
      bodyHeight: body.style.height,
      bodyOverflow: body.style.overflow,
      bodyBackground: body.style.background,
    };

    Object.assign(html.style, {
      margin: "0",
      padding: "0",
      width: "100%",
      height: "100%",
      overflow: "hidden",
      background: "transparent",
    });
    Object.assign(body.style, {
      margin: "0",
      padding: "0",
      width: "100%",
      height: "100%",
      overflow: "hidden",
      background: "transparent",
    });

    return () => {
      Object.assign(html.style, {
        margin: previous.htmlMargin,
        padding: previous.htmlPadding,
        width: previous.htmlWidth,
        height: previous.htmlHeight,
        overflow: previous.htmlOverflow,
        background: previous.htmlBackground,
      });
      Object.assign(body.style, {
        margin: previous.bodyMargin,
        padding: previous.bodyPadding,
        width: previous.bodyWidth,
        height: previous.bodyHeight,
        overflow: previous.bodyOverflow,
        background: previous.bodyBackground,
      });
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 0, h = 0, diag = 0, dpr = 1;
    let raf = 0, last = performance.now(), t = 0;

    /* ================= REGN — tre dybdelag ================= */
    const RAIN_LAYERS = [
      { n: 55,  len: 110, speed: 2000, alpha: 0.34, width: 2.0 }, // tæt på
      { n: 80,  len: 62,  speed: 1250, alpha: 0.20, width: 1.3 }, // mellem
      { n: 110, len: 30,  speed: 700,  alpha: 0.11, width: 0.9 }, // langt væk
    ];
    let dropLayers = [];

    function makeDropSprite(cfg) {
      const c = document.createElement("canvas");
      c.width = Math.ceil(cfg.width * dpr) + 2;
      c.height = Math.ceil(cfg.len * dpr);
      const g = c.getContext("2d");
      const grad = g.createLinearGradient(0, 0, 0, c.height);
      grad.addColorStop(0.0, "rgba(214,232,255,0)");
      grad.addColorStop(0.55, `rgba(224,238,255,${cfg.alpha * 0.55})`);
      grad.addColorStop(0.92, `rgba(240,248,255,${cfg.alpha})`);
      grad.addColorStop(1.0, "rgba(255,255,255,0)");
      g.fillStyle = grad;
      g.fillRect(1, 0, cfg.width * dpr, c.height);
      return c;
}
    function seedRain() {
      dropLayers = RAIN_LAYERS.map((cfg) => ({
        cfg,
        sprite: makeDropSprite(cfg),
        drops: Array.from({ length: cfg.n }, () => ({
          x: (Math.random() - 0.5) * diag * 1.4,
          y: (Math.random() - 0.5) * diag * 1.4,
          scale: 0.75 + Math.random() * 0.5,
        })),
      }));
    }

    function drawRain(dt, gust) {
      const veil = ctx.createLinearGradient(0, 0, 0, h);
      veil.addColorStop(0, "rgba(38,48,66,0.26)");
      veil.addColorStop(1, "rgba(30,40,58,0.10)");
      ctx.fillStyle = veil;
      ctx.fillRect(0, 0, w, h);

      const angle = 0.15 + 0.055 * Math.sin(t * 0.45) + gust * 0.06;
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.rotate(angle);
      const half = (diag * 1.4) / 2;
      for (const layer of dropLayers) {
        const { cfg, sprite, drops } = layer;
        const sw = sprite.width / dpr, sh = sprite.height / dpr;
        for (const d of drops) {
          d.y += cfg.speed * d.scale * dt * (0.85 + gust * 0.3);
          if (d.y > half) { d.y = -half; d.x = (Math.random() - 0.5) * diag * 1.4; }
          ctx.drawImage(sprite, d.x, d.y, sw * d.scale, sh * d.scale);
        }
      }
      ctx.restore();

      const mist = ctx.createLinearGradient(0, h * 0.55, 0, h);
      mist.addColorStop(0, "rgba(190,205,225,0)");
      mist.addColorStop(1, "rgba(190,205,225,0.16)");
      ctx.fillStyle = mist;
      ctx.fillRect(0, h * 0.55, w, h * 0.45);
    }

    /* ================= VIND — buer, fnug og blade ================= */
    let streaks = [], motes = [], leaves = [];
    const LEAF_COLORS = ["#5a8a4a", "#6f9c55", "#4c7a40", "#82a862", "#3f6b38"];

    function seedWind() {
      streaks = [];
      leaves = [];
      motes = Array.from({ length: 38 }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        r: 0.7 + Math.random() * 2.2,
        a: 0.10 + Math.random() * 0.22,
        phase: Math.random() * Math.PI * 2,
        bob: 8 + Math.random() * 26,
        depth: 0.35 + Math.random() * 0.9,
      }));
    }

    function spawnStreak(gust) {
      const depth = 0.3 + Math.random();
      streaks.push({
        x: -120 - Math.random() * 200, y: Math.random() * h,
        len: (70 + Math.random() * 210) * depth, depth,
        arc: (Math.random() - 0.5) * 90 * depth,
        speed: (260 + Math.random() * 420) * depth * (0.6 + gust * 0.9),
        rise: -0.05 - Math.random() * 0.12,
        life: 0, maxLife: 0.9 + Math.random() * 1.1,
        alpha: 0.16 + Math.random() * 0.26,
      });
    }

    function spawnLeaf() {
      const depth = 0.4 + Math.random() * 0.8;
      leaves.push({
        x: -20 - Math.random() * 120, y: Math.random() * h * 0.9,
        size: (3 + Math.random() * 4) * depth, depth,
        color: LEAF_COLORS[Math.floor(Math.random() * LEAF_COLORS.length)],
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 9,
        phase: Math.random() * Math.PI * 2,
        bob: 20 + Math.random() * 45,
        wobbleFreq: 1.2 + Math.random() * 1.6,
        speed: (140 + Math.random() * 260) * depth,
        alpha: 0.55 + Math.random() * 0.4,
      });
    }

    function drawWind(dt, gust) {
      const want = 3 + gust * 14;
      if (Math.random() < want * dt) spawnStreak(gust);
      if (Math.random() < want * dt * 0.6) spawnStreak(gust);

      ctx.lineCap = "round";
      for (let i = streaks.length - 1; i >= 0; i--) {
        const s = streaks[i];
        s.life += dt;
        if (s.life > s.maxLife || s.x > w + 300) { streaks.splice(i, 1); continue; }
        s.x += s.speed * dt;
        s.y += s.speed * s.rise * dt;
        const p = s.life / s.maxLife;
        const a = s.alpha * Math.sin(Math.PI * p) * (0.5 + gust * 0.6);
        if (a <= 0.004) continue;
        const x2 = s.x + s.len, y2 = s.y + s.len * s.rise * 1.4;
        const g = ctx.createLinearGradient(s.x, s.y, x2, y2);
        g.addColorStop(0, "rgba(255,255,255,0)");
        g.addColorStop(0.45, `rgba(255,255,255,${a})`);
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.strokeStyle = g;
        ctx.lineWidth = 0.8 + s.depth * 1.5;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.quadraticCurveTo(s.x + s.len * 0.5, s.y + s.arc, x2, y2);
        ctx.stroke();
      }

      for (const m of motes) {
        m.x += (55 + gust * 190) * m.depth * dt;
        m.y += Math.sin(t * 1.5 + m.phase) * m.bob * dt;
        if (m.x > w + 10) { m.x = -10; m.y = Math.random() * h; }
        ctx.fillStyle = `rgba(255,250,240,${m.a * (0.45 + gust * 0.7)})`;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r * m.depth, 0, Math.PI * 2);
        ctx.fill();
      }

      // Blade — spawner i klumper når vindstødene topper
      if (leaves.length < 22 && Math.random() < (1.2 + gust * 4) * dt) spawnLeaf();
      for (let i = leaves.length - 1; i >= 0; i--) {
        const L = leaves[i];
        L.x += (L.speed + gust * 180 * L.depth) * dt;
        L.y += Math.sin(t * L.wobbleFreq + L.phase) * L.bob * dt + 12 * dt;
        L.rot += L.rotSpeed * (0.5 + gust) * dt;
        if (L.x > w + 30 || L.y > h + 30) { leaves.splice(i, 1); continue; }
        ctx.save();
        ctx.translate(L.x, L.y);
        ctx.rotate(L.rot);
        const flip = 0.35 + 0.65 * Math.abs(Math.sin(t * 2.2 + L.phase));
        ctx.scale(1, flip);
        ctx.globalAlpha = L.alpha;
        ctx.fillStyle = L.color;
        ctx.beginPath();
        ctx.moveTo(-L.size, 0);
        ctx.quadraticCurveTo(0, -L.size * 0.7, L.size, 0);
        ctx.quadraticCurveTo(0, L.size * 0.7, -L.size, 0);
        ctx.fill();
        ctx.strokeStyle = "rgba(30,50,25,0.35)";
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(-L.size * 0.8, 0);
        ctx.lineTo(L.size * 0.8, 0);
        ctx.stroke();
        ctx.restore();
        ctx.globalAlpha = 1;
      }
    }

    /* ================= SOL — glød, stråler, glimtende støv ================= */
    let sunMotes = [];

    function seedSun() {
      sunMotes = Array.from({ length: 26 }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        r: 0.6 + Math.random() * 1.8,
        a: 0.08 + Math.random() * 0.2,
        phase: Math.random() * Math.PI * 2,
        vy: -4 - Math.random() * 10,
        vx: (Math.random() - 0.5) * 8,
      }));
    }

    function drawSun(dt) {
      const gx = w * 0.12, gy = -h * 0.05;
      const glow = ctx.createRadialGradient(gx, gy, 0, gx, gy, Math.max(w, h) * 0.7);
      glow.addColorStop(0, "rgba(255,236,190,0.55)");
      glow.addColorStop(0.35, "rgba(255,224,160,0.18)");
      glow.addColorStop(1, "rgba(255,220,150,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);

      // Lysstråler der langsomt drejer og pulserer i utakt
      ctx.save();
      ctx.translate(gx, gy);
      for (let i = 0; i < 5; i++) {
        ctx.save();
        ctx.rotate(t * 0.02 + i * (Math.PI / 7) + 0.5);
        const alpha = Math.max(0, 0.05 + 0.03 * Math.sin(t * 0.6 + i * 2.1));
        const ray = ctx.createLinearGradient(0, 0, 0, h * 1.2);
        ray.addColorStop(0, `rgba(255,244,210,${alpha})`);
        ray.addColorStop(1, "rgba(255,244,210,0)");
        ctx.fillStyle = ray;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-40 - i * 12, h * 1.2);
        ctx.lineTo(40 + i * 12, h * 1.2);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();

      for (const m of sunMotes) {
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        if (m.y < -10 || m.x < -10 || m.x > w + 10) { m.y = h + 10; m.x = Math.random() * w; }
        const tw = 0.5 + 0.5 * Math.sin(t * 2 + m.phase);
        ctx.fillStyle = `rgba(255,250,225,${m.a * tw})`;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    /* ================= SKYET — parallax-skyer ================= */
    let clouds = [];

    function makeCloudSprite(scale) {
      const cw = Math.ceil(320 * scale), ch = Math.ceil(150 * scale);
      const c = document.createElement("canvas");
      c.width = cw; c.height = ch;
      const g = c.getContext("2d");
      const blobs = 7 + Math.floor(Math.random() * 5);
      for (let i = 0; i < blobs; i++) {
        const bx = cw * 0.15 + Math.random() * cw * 0.7;
        const by = ch * 0.45 + Math.random() * ch * 0.35;
        const br = (26 + Math.random() * 46) * scale;
        const grad = g.createRadialGradient(bx, by, 0, bx, by, br);
        grad.addColorStop(0, "rgba(255,255,255,0.55)");
        grad.addColorStop(0.7, "rgba(248,249,252,0.22)");
        grad.addColorStop(1, "rgba(248,249,252,0)");
        g.fillStyle = grad;
        g.beginPath();
        g.arc(bx, by, br, 0, Math.PI * 2);
        g.fill();
      }
      return c;
    }

    function seedClouds() {
      clouds = [];
      const layers = [
        { n: 3, depth: 1.0, y0: 0.02 },
        { n: 4, depth: 0.6, y0: 0.14 },
        { n: 4, depth: 0.35, y0: 0.30 },
      ];
      for (const l of layers) {
        for (let i = 0; i < l.n; i++) {
          const scale = 0.6 + l.depth * 0.9;
          clouds.push({
            sprite: makeCloudSprite(scale),
            x: Math.random() * w * 1.2 - w * 0.1,
            y: (l.y0 + Math.random() * 0.32) * h,
            speed: 5 + 16 * l.depth,
            depth: l.depth,
            alpha: 0.45 + 0.45 * l.depth,
          });
        }
      }
      clouds.sort((a, b) => a.depth - b.depth);
    }

    function drawClouds(dt) {
      ctx.fillStyle = "rgba(118,126,138,0.14)";
      ctx.fillRect(0, 0, w, h);
      for (const c of clouds) {
        c.x += c.speed * dt;
        if (c.x > w + 60) c.x = -c.sprite.width - 60;
        ctx.globalAlpha = c.alpha;
        ctx.drawImage(c.sprite, c.x, c.y);
        ctx.globalAlpha = 1;
      }
    }

    /* ================= NAT — måne, stjerner, stjerneskud, ildfluer ================= */
    let stars = [], shooting = [], fireflies = [];

    function seedNight() {
      stars = Array.from({ length: 130 }, () => ({
        x: Math.random() * w, y: Math.random() * h * 0.85,
        r: 0.4 + Math.random() * 1.3,
        a: 0.25 + Math.random() * 0.6,
        phase: Math.random() * Math.PI * 2,
        tw: 0.5 + Math.random() * 2,
      }));
      fireflies = Array.from({ length: 8 }, () => ({
        x: Math.random() * w, y: h * 0.55 + Math.random() * h * 0.4,
        phase: Math.random() * Math.PI * 2,
        speed: 6 + Math.random() * 14,
      }));
      shooting = [];
    }

    function spawnShooting() {
      shooting.push({
        x: Math.random() * w * 0.7, y: Math.random() * h * 0.3,
        vx: 500 + Math.random() * 300, vy: 180 + Math.random() * 120,
        life: 0, maxLife: 0.7 + Math.random() * 0.4,
      });
    }

    function drawNight(dt) {
      const veil = ctx.createLinearGradient(0, 0, 0, h);
      veil.addColorStop(0, "rgba(10,16,38,0.50)");
      veil.addColorStop(1, "rgba(18,24,48,0.30)");
      ctx.fillStyle = veil;
      ctx.fillRect(0, 0, w, h);

      const mx = w * 0.82, my = h * 0.16;
      const glow = ctx.createRadialGradient(mx, my, 0, mx, my, 180);
      glow.addColorStop(0, "rgba(235,240,255,0.9)");
      glow.addColorStop(0.12, "rgba(220,228,255,0.32)");
      glow.addColorStop(1, "rgba(220,228,255,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(mx - 200, my - 200, 400, 400);
      ctx.fillStyle = "rgba(245,247,255,0.95)";
      ctx.beginPath();
      ctx.arc(mx, my, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(185,195,225,0.32)";
      ctx.beginPath(); ctx.arc(mx - 7, my - 4, 5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(mx + 6, my + 8, 3.5, 0, Math.PI * 2); ctx.fill();

      // Stjerner blinker i hver sin takt
      for (const s of stars) {
        const tw = 0.55 + 0.45 * Math.sin(t * s.tw + s.phase);
        ctx.fillStyle = `rgba(255,255,255,${s.a * tw})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Sjældne stjerneskud
      if (Math.random() < 0.08 * dt) spawnShooting();
      ctx.lineCap = "round";
      for (let i = shooting.length - 1; i >= 0; i--) {
        const s = shooting[i];
        s.life += dt;
        if (s.life > s.maxLife) { shooting.splice(i, 1); continue; }
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        const a = Math.sin(Math.PI * (s.life / s.maxLife)) * 0.8;
        const g = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * 0.12, s.y - s.vy * 0.12);
        g.addColorStop(0, `rgba(255,255,255,${a})`);
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x - s.vx * 0.12, s.y - s.vy * 0.12);
        ctx.stroke();
      }

      // Ildfluer
      for (const f of fireflies) {
        f.x += Math.sin(t * 0.7 + f.phase) * f.speed * dt;
        f.y += Math.cos(t * 0.5 + f.phase * 1.3) * f.speed * 0.6 * dt;
        const pulse = Math.max(0, Math.sin(t * 1.3 + f.phase));
        const a = 0.5 * pulse * pulse;
        if (a > 0.02) {
          const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, 6);
          g.addColorStop(0, `rgba(220,255,160,${a})`);
          g.addColorStop(1, "rgba(220,255,160,0)");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(f.x, f.y, 6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    /* ================= LOOP ================= */
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      diag = Math.hypot(w, h);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seedRain(); seedWind(); seedSun(); seedClouds(); seedNight();
    }

    function frame(now) {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      t += dt;
      ctx.clearRect(0, 0, w, h);

      const gust = Math.max(0, 0.45 + 0.34 * Math.sin(t * 0.37) + 0.21 * Math.sin(t * 1.13 + 1.7));
      const m = modeRef.current;

      if (m === "rain") drawRain(dt, gust);
      else if (m === "wind") drawWind(dt, gust);
      else if (m === "sunny") drawSun(dt);
      else if (m === "cloudy") drawClouds(dt);
      else if (m === "night") drawNight(dt);

      raf = requestAnimationFrame(frame);
    }

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    if (!reduced) raf = requestAnimationFrame(frame);
    else {
      // Reduced motion: ét statisk frame
      ctx.clearRect(0, 0, w, h);
      const m = modeRef.current;
      if (m === "rain") drawRain(0, 0.4);
      else if (m === "sunny") drawSun(0);
      else if (m === "cloudy") drawClouds(0);
      else if (m === "night") drawNight(0);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 5,
        transition: "opacity 600ms ease",
        opacity: mode ? 1 : 0,
      }}
    />
  );
}
