import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sampleRate = 44_100;
const durationSeconds = 0.34;
const sampleCount = Math.ceil(sampleRate * durationSeconds);
const samples = new Float64Array(sampleCount);

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function softNote(time, start, frequency, amplitude, decay) {
  const elapsed = time - start;
  if (elapsed < 0) return 0;
  const attack = clamp(elapsed / 0.008, 0, 1);
  const envelope = attack * Math.exp(-elapsed * decay);
  const phase = Math.PI * 2 * frequency * elapsed;
  return amplitude * envelope * (
    Math.sin(phase) +
    Math.sin(phase * 2 + 0.18) * 0.18 +
    Math.sin(phase * 3 + 0.42) * 0.045
  );
}

let seed = 0x43_4f_5a_59;
let lowPassedNoise = 0;
let previousLowPassedNoise = 0;

function randomSigned() {
  seed = (Math.imul(seed, 1_664_525) + 1_013_904_223) >>> 0;
  return (seed / 0xffff_ffff) * 2 - 1;
}

for (let index = 0; index < sampleCount; index += 1) {
  const time = index / sampleRate;

  // A gentle descending two-note "put away" cue. Sine-heavy partials keep it
  // warm and rounded instead of sounding like a harsh error or closing latch.
  let sample = softNote(time, 0, 523.25, 0.38, 15.5);
  sample += softNote(time, 0.052, 392, 0.34, 12.8);

  // A very soft low wooden body gives the action weight without a bass thud.
  const bodyElapsed = time - 0.004;
  if (bodyElapsed >= 0) {
    const bodyFrequency = 178 - Math.min(bodyElapsed / 0.13, 1) * 30;
    const bodyEnvelope =
      clamp(bodyElapsed / 0.006, 0, 1) *
      Math.exp(-bodyElapsed * 24);
    sample += Math.sin(Math.PI * 2 * bodyFrequency * bodyElapsed) * bodyEnvelope * 0.11;
  }

  // Filtered air creates a subtle tactile finish. It is deliberately kept
  // below the tonal layers so there is no brittle click or abrasive hiss.
  lowPassedNoise += (randomSigned() - lowPassedNoise) * 0.075;
  const softenedNoise = lowPassedNoise * 0.78 + previousLowPassedNoise * 0.22;
  previousLowPassedNoise = lowPassedNoise;
  const airEnvelope =
    clamp(time / 0.012, 0, 1) *
    Math.exp(-time * 26);
  sample += softenedNoise * airEnvelope * 0.035;

  const endFade = clamp((durationSeconds - time) / 0.045, 0, 1);
  samples[index] = Math.tanh(sample * 1.18) * endFade;
}

let peak = 0;
for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
const targetPeak = 0.72;
const normalization = peak > 0 ? targetPeak / peak : 1;

const dataLength = sampleCount * 2;
const wav = Buffer.alloc(44 + dataLength);
wav.write('RIFF', 0);
wav.writeUInt32LE(36 + dataLength, 4);
wav.write('WAVE', 8);
wav.write('fmt ', 12);
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(sampleRate, 24);
wav.writeUInt32LE(sampleRate * 2, 28);
wav.writeUInt16LE(2, 32);
wav.writeUInt16LE(16, 34);
wav.write('data', 36);
wav.writeUInt32LE(dataLength, 40);

for (let index = 0; index < sampleCount; index += 1) {
  const pcm = Math.round(clamp(samples[index] * normalization, -1, 1) * 32_767);
  wav.writeInt16LE(pcm, 44 + index * 2);
}

const outputPath = resolve('assets/audio/ui/asset-delete.wav');
writeFileSync(outputPath, wav);
console.log(`Wrote ${outputPath} (${durationSeconds.toFixed(2)}s, mono PCM16).`);
