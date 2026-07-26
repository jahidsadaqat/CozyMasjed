import { useEffect, useRef } from "react";

/**
 * useWeatherAmbience — ambient lyd pr. vejrtilstand, syntetiseret live
 * med Web Audio. Ingen lydfiler nødvendige.
 *
 *   const [soundOn, setSoundOn] = useState(false);
 *   useWeatherAmbience(weather, soundOn);
 *   ...
 *   <button onClick={() => setSoundOn(v => !v)}>{soundOn ? "🔊" : "🔇"}</button>
 *
 * mode: "sunny" | "cloudy" | "rain" | "wind" | "night" | null
 * enabled: SKAL først sættes true efter et bruger-klik —
 *          browsere blokerer al lyd før første user gesture.
 *
 * Crossfader blødt mellem tilstande; Rain og Cloudy bruger længere fades.
 * og genbruges, så gentagne skift ikke lækker noder.
 */
const MODE_VOL = { sunny: 0.5, cloudy: 0.18, rain: 0.26, wind: 0.6, night: 0.55 };
const MODE_FADE_SECONDS = { cloudy: 2.6, rain: 2.3 };

export default function useWeatherAmbience(mode, enabled = false) {
  const acRef = useRef(null);
  const enginesRef = useRef({});

  useEffect(() => {
    if (!enabled) {
      // Fade alt ud, men riv ikke ned — vi skal kunne tænde igen
      const AC = acRef.current;
      if (AC) {
        const now = AC.currentTime;
        for (const e of Object.values(enginesRef.current)) {
          e.out.gain.cancelScheduledValues(now);
          e.out.gain.setValueAtTime(e.out.gain.value, now);
          e.out.gain.linearRampToValueAtTime(0, now + 0.8);
        }
      }
      return;
    }

    // Opret AudioContext ved første aktivering (kræver user gesture)
    if (!acRef.current) {
      acRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    const AC = acRef.current;
    if (AC.state === "suspended") AC.resume();

    function noiseSrc(kind = "white") {
      const n = AC.sampleRate * 2;
      const buf = AC.createBuffer(1, n, AC.sampleRate);
      const d = buf.getChannelData(0);
      if (kind === "pink") {
        let b0 = 0;
        let b1 = 0;
        let b2 = 0;
        let b3 = 0;
        let b4 = 0;
        let b5 = 0;
        let b6 = 0;
        for (let i = 0; i < n; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.969 * b2 + white * 0.153852;
          b3 = 0.8665 * b3 + white * 0.3104856;
          b4 = 0.55 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.016898;
          d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
          b6 = white * 0.115926;
        }
      } else {
        for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      }
      const src = AC.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      return src;
    }

    function makeEngine(m) {
      const out = AC.createGain();
      out.gain.value = 0;
      out.connect(AC.destination);
      const timers = [];

      if (m === "rain") {
        const src = noiseSrc("pink");
        const f = AC.createBiquadFilter();
        f.type = "highpass";
        f.frequency.value = 420;
        f.Q.value = 0.3;
        const rainLowpass = AC.createBiquadFilter();
        rainLowpass.type = "lowpass";
        rainLowpass.frequency.value = 2600;
        rainLowpass.Q.value = 0.25;
        const gRain = AC.createGain();
        gRain.gain.value = 0.17;
        src.connect(f);
        f.connect(rainLowpass);
        rainLowpass.connect(gRain);
        gRain.connect(out);
        src.start();
        // Få, bløde dråber oven i den rolige regnflade.
        timers.push(setInterval(() => {
          if (out.gain.value < 0.01) return;
          const o = AC.createOscillator(), g = AC.createGain();
          o.type = "sine";
          o.frequency.setValueAtTime(720 + Math.random() * 520, AC.currentTime);
          o.frequency.exponentialRampToValueAtTime(
            520 + Math.random() * 260,
            AC.currentTime + 0.16
          );
          g.gain.setValueAtTime(0.006 + Math.random() * 0.005, AC.currentTime);
          g.gain.exponentialRampToValueAtTime(0.0001, AC.currentTime + 0.16);
          o.connect(g);
          g.connect(out);
          o.start();
          o.stop(AC.currentTime + 0.18);
        }, 1100));

        const swell = AC.createOscillator();
        swell.frequency.value = 0.035;
        const swellDepth = AC.createGain();
        swellDepth.gain.value = 0.018;
        swell.connect(swellDepth);
        swellDepth.connect(gRain.gain);
        swell.start();
      }

      else if (m === "cloudy") {
        const src = noiseSrc("pink");
        const highpass = AC.createBiquadFilter();
        highpass.type = "highpass";
        highpass.frequency.value = 140;
        highpass.Q.value = 0.3;
        const f = AC.createBiquadFilter();
        f.type = "lowpass";
        f.frequency.value = 1050;
        const g = AC.createGain();
        g.gain.value = 0.1;
        src.connect(highpass);
        highpass.connect(f);
        f.connect(g);
        g.connect(out);
        src.start();
        // Langsom, diskret bevægelse uden tung pumpen eller sub-rumlen.
        const lfo = AC.createOscillator();
        lfo.frequency.value = 0.035;
        const lfoF = AC.createGain();
        lfoF.gain.value = 55;
        const lfoG = AC.createGain();
        lfoG.gain.value = 0.012;
        lfo.connect(lfoF);
        lfoF.connect(f.frequency);
        lfo.connect(lfoG);
        lfoG.connect(g.gain);
        lfo.start();
      }

      else if (m === "wind") {
        const src = noiseSrc();
        const f = AC.createBiquadFilter();
        f.type = "lowpass";
        f.frequency.value = 700;
        const g = AC.createGain();
        g.gain.value = 0.7;
        src.connect(f);
        f.connect(g);
        g.connect(out);
        src.start();
        const lfo = AC.createOscillator();
        lfo.frequency.value = 0.16;
        const lfoF = AC.createGain();
        lfoF.gain.value = 320;
        const lfoG = AC.createGain();
        lfoG.gain.value = 0.28;
        lfo.connect(lfoF);
        lfoF.connect(f.frequency);
        lfo.connect(lfoG);
        lfoG.connect(g.gain);
        lfo.start();
      }

      else if (m === "sunny") {
        const src = noiseSrc();
        const f = AC.createBiquadFilter();
        f.type = "lowpass";
        f.frequency.value = 500;
        const g = AC.createGain();
        g.gain.value = 0.18;
        src.connect(f);
        f.connect(g);
        g.connect(out);
        src.start();
        // Fuglekvidder i små grupper med pauser
        function chirpGroup() {
          if (out.gain.value < 0.01) return;
          let t0 = AC.currentTime + 0.05;
          const nCh = 2 + Math.floor(Math.random() * 4);
          for (let i = 0; i < nCh; i++) {
            const o = AC.createOscillator(), g2 = AC.createGain();
            const f0 = 2200 + Math.random() * 2000;
            const d = 0.06 + Math.random() * 0.1;
            o.frequency.setValueAtTime(f0, t0);
            o.frequency.linearRampToValueAtTime(
              f0 + (Math.random() < 0.6 ? 1 : -1) * (300 + Math.random() * 700),
              t0 + d
            );
            g2.gain.setValueAtTime(0, t0);
            g2.gain.linearRampToValueAtTime(0.10 + Math.random() * 0.08, t0 + d * 0.3);
            g2.gain.linearRampToValueAtTime(0, t0 + d);
            o.connect(g2);
            g2.connect(out);
            o.start(t0);
            o.stop(t0 + d + 0.02);
            t0 += d + 0.04 + Math.random() * 0.12;
          }
        }
        timers.push(setInterval(() => { if (Math.random() < 0.5) chirpGroup(); }, 1800));
      }

      else if (m === "night") {
        const src = noiseSrc();
        const f = AC.createBiquadFilter();
        f.type = "lowpass";
        f.frequency.value = 250;
        const g = AC.createGain();
        g.gain.value = 0.06;
        src.connect(f);
        f.connect(g);
        g.connect(out);
        src.start();
        // Fårekyllinger: 4,4 kHz med AM — to stemmer i forskudt rytme
        function cricketBurst(fc, amHz) {
          if (out.gain.value < 0.01) return;
          let t0 = AC.currentTime + 0.02;
          const nCh = 3 + Math.floor(Math.random() * 4);
          for (let i = 0; i < nCh; i++) {
            const o = AC.createOscillator();
            o.frequency.value = fc;
            const env = AC.createGain();
            env.gain.value = 0;
            const am = AC.createOscillator();
            am.frequency.value = amHz;
            const amG = AC.createGain();
            amG.gain.value = 0.06;
            am.connect(amG);
            amG.connect(env.gain);
            env.gain.setValueAtTime(0, t0);
            env.gain.linearRampToValueAtTime(0.07, t0 + 0.01);
            env.gain.setValueAtTime(0.07, t0 + 0.05);
            env.gain.linearRampToValueAtTime(0, t0 + 0.06);
            o.connect(env);
            env.connect(out);
            o.start(t0);
            o.stop(t0 + 0.08);
            am.start(t0);
            am.stop(t0 + 0.08);
            t0 += 0.16 + Math.random() * 0.1;
          }
        }
        timers.push(setInterval(() => cricketBurst(4400, 45), 1400));
        timers.push(setInterval(() => cricketBurst(4750, 52), 1900));
        // Fjern ugle: to bløde hyl hvert 14. sekund
        timers.push(setInterval(() => {
          if (out.gain.value < 0.01) return;
          const t0 = AC.currentTime + 0.1;
          for (const dd of [0, 0.65]) {
            const o = AC.createOscillator(), g2 = AC.createGain();
            o.frequency.setValueAtTime(340, t0 + dd);
            o.frequency.linearRampToValueAtTime(315, t0 + dd + 0.5);
            g2.gain.setValueAtTime(0, t0 + dd);
            g2.gain.linearRampToValueAtTime(0.05, t0 + dd + 0.15);
            g2.gain.linearRampToValueAtTime(0, t0 + dd + 0.5);
            o.connect(g2);
            g2.connect(out);
            o.start(t0 + dd);
            o.stop(t0 + dd + 0.55);
          }
        }, 14000));
      }

      return { out, timers };
    }

    // Byg motoren for den aktive tilstand hvis den ikke findes
    if (mode && MODE_VOL[mode] && !enginesRef.current[mode]) {
      enginesRef.current[mode] = makeEngine(mode);
    }

    // Crossfade: aktiv tilstand op, alle andre ned
    const now = AC.currentTime;
    for (const [m, e] of Object.entries(enginesRef.current)) {
      e.out.gain.cancelScheduledValues(now);
      e.out.gain.setValueAtTime(e.out.gain.value, now);
      const fadeSeconds = Math.max(
        MODE_FADE_SECONDS[mode] ?? 1.2,
        MODE_FADE_SECONDS[m] ?? 1.2
      );
      e.out.gain.linearRampToValueAtTime(
        m === mode ? MODE_VOL[m] : 0,
        now + fadeSeconds
      );
    }
  }, [mode, enabled]);

  // Fuld oprydning ved unmount
  useEffect(() => {
    return () => {
      for (const e of Object.values(enginesRef.current)) {
        e.timers.forEach(clearInterval);
        try { e.out.disconnect(); } catch {}
      }
      enginesRef.current = {};
      if (acRef.current) {
        acRef.current.close().catch(() => {});
        acRef.current = null;
      }
    };
  }, []);
}
