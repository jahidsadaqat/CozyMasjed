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
 * Crossfader blødt (~1,2 s) mellem tilstande. Motorer bygges lazy
 * og genbruges, så gentagne skift ikke lækker noder.
 */
const MODE_VOL = { sunny: 0.5, cloudy: 0.4, rain: 0.7, wind: 0.6, night: 0.55 };

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

    function noiseSrc() {
      const n = AC.sampleRate * 2;
      const buf = AC.createBuffer(1, n, AC.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
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
        const src = noiseSrc();
        const f = AC.createBiquadFilter();
        f.type = "bandpass";
        f.frequency.value = 2400;
        f.Q.value = 0.35;
        src.connect(f);
        f.connect(out);
        src.start();
        // Dråbe-tik oveni susen
        timers.push(setInterval(() => {
          if (out.gain.value < 0.01) return;
          const o = AC.createOscillator(), g = AC.createGain();
          o.frequency.value = 1500 + Math.random() * 3500;
          g.gain.setValueAtTime(0.05 + Math.random() * 0.08, AC.currentTime);
          g.gain.exponentialRampToValueAtTime(0.0001, AC.currentTime + 0.05);
          o.connect(g);
          g.connect(out);
          o.start();
          o.stop(AC.currentTime + 0.06);
        }, 90));
      }

      else if (m === "wind" || m === "cloudy") {
        const src = noiseSrc();
        const f = AC.createBiquadFilter();
        f.type = "lowpass";
        f.frequency.value = m === "wind" ? 700 : 350;
        const g = AC.createGain();
        g.gain.value = 0.7;
        src.connect(f);
        f.connect(g);
        g.connect(out);
        src.start();
        // Vindstød: LFO på både filter-cutoff og lydstyrke
        const lfo = AC.createOscillator();
        lfo.frequency.value = m === "wind" ? 0.16 : 0.09;
        const lfoF = AC.createGain();
        lfoF.gain.value = m === "wind" ? 320 : 90;
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
      e.out.gain.linearRampToValueAtTime(m === mode ? MODE_VOL[m] : 0, now + 1.2);
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
