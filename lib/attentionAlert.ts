const VIBRATE_PATTERN = [280, 90, 280, 90, 280, 120, 400];
const VIBRATE_REPEAT_MS = 2200;

let vibrateTimer: ReturnType<typeof setInterval> | null = null;
let titleTimer: ReturnType<typeof setInterval> | null = null;
let savedTitle = "";

export function isVibrationSupported(): boolean {
  return typeof navigator !== "undefined" && "vibrate" in navigator;
}

export function startSirenVibration(): void {
  if (!isVibrationSupported()) return;
  stopSirenVibration();
  navigator.vibrate(VIBRATE_PATTERN);
  vibrateTimer = setInterval(() => {
    navigator.vibrate(VIBRATE_PATTERN);
  }, VIBRATE_REPEAT_MS);
}

export function stopSirenVibration(): void {
  if (vibrateTimer !== null) {
    clearInterval(vibrateTimer);
    vibrateTimer = null;
  }
  if (isVibrationSupported()) {
    navigator.vibrate(0);
  }
}

export function startTitleFlash(): void {
  if (typeof document === "undefined") return;
  stopTitleFlash();
  savedTitle = document.title;
  let on = false;
  titleTimer = setInterval(() => {
    document.title = on ? savedTitle : "⚠ SIREN DETECTED";
    on = !on;
  }, 550);
}

export function stopTitleFlash(): void {
  if (titleTimer !== null) {
    clearInterval(titleTimer);
    titleTimer = null;
  }
  if (typeof document !== "undefined" && savedTitle) {
    document.title = savedTitle;
  }
}

export function stopAllAttentionAlerts(): void {
  stopSirenVibration();
  stopSirenAlertTone();
  stopTitleFlash();
}

let toneCtx: AudioContext | null = null;
let toneTimer: ReturnType<typeof setInterval> | null = null;

export function startSirenAlertTone(): void {
  if (typeof window === "undefined") return;
  stopSirenAlertTone();

  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctx) return;

  toneCtx = new Ctx();
  if (toneCtx.state === "suspended") {
    void toneCtx.resume();
  }

  const playBeep = (freq: number) => {
    if (!toneCtx) return;
    const osc = toneCtx.createOscillator();
    const gain = toneCtx.createGain();
    osc.type = "square";
    osc.frequency.value = freq;
    gain.gain.value = 0.12;
    osc.connect(gain);
    gain.connect(toneCtx.destination);
    const t = toneCtx.currentTime;
    osc.start(t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    osc.stop(t + 0.22);
  };

  let high = true;
  playBeep(880);
  toneTimer = setInterval(() => {
    high = !high;
    playBeep(high ? 880 : 660);
  }, 380);
}

export function stopSirenAlertTone(): void {
  if (toneTimer !== null) {
    clearInterval(toneTimer);
    toneTimer = null;
  }
  if (toneCtx) {
    toneCtx.close().catch(() => {});
    toneCtx = null;
  }
}
