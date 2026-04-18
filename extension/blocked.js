const params = new URLSearchParams(location.search);
const redirectUrl = params.get("redirect") || "https://tcd.blackboard.com/ultra/institution-page";
const site = params.get("site") || "";

try {
  document.getElementById("siteName").textContent = new URL(site).hostname;
} catch { document.getElementById("siteName").textContent = site; }

function startCountdown(onDone) {
  let t = 3;
  const el = document.getElementById("timer");
  const iv = setInterval(() => {
    t--;
    el.textContent = t;
    if (t <= 0) {
      clearInterval(iv);
      if (onDone) onDone();
      location.replace(redirectUrl);
    }
  }, 1000);
}

chrome.storage.sync.get({ alarmEnabled: true }, ({ alarmEnabled }) => {
  if (!alarmEnabled) {
    startCountdown();
    return;
  }

  const ctx = new (window.AudioContext || window.webkitAudioContext)();

  // --- Signal chain ---
  // [oscillators + noise] -> distortion -> compressor (maxes out loudness) -> master gain -> destination

  function makeDistortion(amount) {
    const ws = ctx.createWaveShaper();
    const n = 1024;
    const curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      curve[i] = ((Math.PI + amount) * x) / (Math.PI + amount * Math.abs(x));
    }
    ws.curve = curve;
    ws.oversample = "4x";
    return ws;
  }

  // Pre-generated noise buffer for white-noise bursts
  function makeNoiseBuffer() {
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }
  const noiseBuffer = makeNoiseBuffer();

  const distortion = makeDistortion(1200);

  // Dynamics compressor — brick-wall limiter pushes the signal to maximum
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.setValueAtTime(-30, ctx.currentTime);
  compressor.knee.setValueAtTime(0, ctx.currentTime);
  compressor.ratio.setValueAtTime(20, ctx.currentTime);
  compressor.attack.setValueAtTime(0, ctx.currentTime);
  compressor.release.setValueAtTime(0.25, ctx.currentTime);

  const master = ctx.createGain();
  master.gain.setValueAtTime(8.0, ctx.currentTime); // cranked hard

  distortion.connect(compressor);
  compressor.connect(master);
  master.connect(ctx.destination);

  // Melodic siren cycle — hits multiple octaves
  const fundamentals = [880, 587, 1174, 440, 988, 1318, 330];
  let step = 0;
  const ms = 200; // faster pulses = more aggressive

  function pulse() {
    const t = ctx.currentTime;
    const f = fundamentals[step % fundamentals.length];
    const dur = ms / 1000;

    // Five stacked oscillators per pulse for maximum density:
    // sub, fundamental sawtooth, fundamental square, 2x octave, 3x piercing
    const layers = [
      { type: "sawtooth", freq: f * 0.5,  gain: 1.2 }, // sub-body
      { type: "sawtooth", freq: f,         gain: 1.5 }, // fundamental A
      { type: "square",   freq: f * 1.007, gain: 1.3 }, // fundamental B (detuned)
      { type: "sawtooth", freq: f * 2,     gain: 1.0 }, // octave up
      { type: "square",   freq: f * 3,     gain: 0.8 }, // piercing top
    ];

    for (const layer of layers) {
      const osc = ctx.createOscillator();
      osc.type = layer.type;
      osc.frequency.setValueAtTime(layer.freq, t);
      const env = ctx.createGain();
      env.gain.setValueAtTime(layer.gain, t);
      env.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(env);
      env.connect(distortion);
      osc.start(t);
      osc.stop(t + dur);
    }

    // White-noise burst on attack for extra harshness
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const noiseEnv = ctx.createGain();
    noiseEnv.gain.setValueAtTime(0.8, t);
    noiseEnv.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    noise.connect(noiseEnv);
    noiseEnv.connect(distortion);
    noise.start(t);
    noise.stop(t + 0.05);

    step++;
  }

  let alarmInterval = null;
  startCountdown(() => {
    if (alarmInterval) clearInterval(alarmInterval);
    ctx.close();
  });

  const tryPlay = () => {
    ctx.resume().then(() => {
      if (ctx.state === "running" && !alarmInterval) {
        pulse();
        alarmInterval = setInterval(pulse, ms);
      }
    }).catch(() => {});
  };

  tryPlay();

  // Autoplay unlock on any gesture
  const unlock = () => tryPlay();
  document.addEventListener("click", unlock, { once: true });
  document.addEventListener("keydown", unlock, { once: true });
  document.addEventListener("pointerdown", unlock, { once: true });
});
