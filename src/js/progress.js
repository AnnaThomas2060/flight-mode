// Monotonic progress engine + descent-ding trigger (Section 6.2).
//
// All timing uses performance.now() (monotonic) — never wall-clock deltas.
// Background/blur keeps advancing (backgroundThrottling is disabled in main).
// System sleep is NOT credited: large tick gaps are treated as paused time,
// and main.js forwards powerMonitor suspend/resume as a backup signal.

const TICK_MS = 1000;        // state checks run on a timer (rAF stops when hidden)
const SLEEP_GAP_MS = 10000;  // a tick gap larger than this means the machine slept

export function createProgressEngine({ plannedMinutes, descentLeadMinutes = 0, onTick, onDescent, onComplete }) {
  const plannedMs = plannedMinutes * 60000;
  const leadMs = descentLeadMinutes * 60000;

  const startT = performance.now();
  let pausedAccum = 0;     // ms excluded from progress (user pauses + sleep gaps)
  let paused = false;
  let pauseStarted = 0;
  let lastTick = startT;
  let dingFired = false;
  let finished = false;
  let stopped = false;
  let rafId = 0;

  function focusedMs(now = performance.now()) {
    const pausedNow = paused ? now - pauseStarted : 0;
    return Math.max(0, now - startT - pausedAccum - pausedNow);
  }

  function progress(now = performance.now()) {
    return Math.min(focusedMs(now) / plannedMs, 1);
  }

  function check() {
    if (stopped || finished) return;
    const now = performance.now();
    const gap = now - lastTick;
    lastTick = now;
    // Slept (or process was frozen): don't credit the gap as focus time.
    // While user-paused, pause accounting already excludes it.
    if (!paused && gap > SLEEP_GAP_MS) pausedAccum += gap - TICK_MS;
    if (paused) return;

    const el = focusedMs(now);
    if (!dingFired && plannedMs > leadMs && el >= plannedMs - leadMs) {
      dingFired = true;
      onDescent?.();
    }
    if (el >= plannedMs) {
      finished = true;
      stop();
      onTick?.(1);
      onComplete?.();
    }
  }

  function frame() {
    if (stopped || finished) return;
    if (!paused) onTick?.(progress());
    rafId = requestAnimationFrame(frame);
  }

  const intervalId = setInterval(check, TICK_MS);
  rafId = requestAnimationFrame(frame);

  // Authoritative sleep signal: app.js re-broadcasts Electron's powerMonitor
  // events as a window 'power' event so each engine can cleanly unsubscribe.
  let suspendedAt = 0;
  const onPower = (evt) => {
    const state = evt.detail;
    if (state === 'suspend') {
      suspendedAt = performance.now();
    } else if (state === 'resume' && suspendedAt && !paused) {
      // If performance.now() kept counting across sleep, exclude it.
      pausedAccum += performance.now() - suspendedAt;
      lastTick = performance.now(); // don't double-count via the gap heuristic
      suspendedAt = 0;
    }
  };
  window.addEventListener('power', onPower);

  function stop() {
    stopped = true;
    clearInterval(intervalId);
    cancelAnimationFrame(rafId);
    window.removeEventListener('power', onPower);
  }

  return {
    pause() {
      if (paused || finished) return;
      paused = true;
      pauseStarted = performance.now();
    },
    resume() {
      if (!paused) return;
      pausedAccum += performance.now() - pauseStarted;
      lastTick = performance.now();
      paused = false;
    },
    stop,
    isPaused: () => paused,
    getProgress: () => progress(),
    /** Whole focus minutes actually completed so far on this leg. */
    getFocusedMinutes: () => Math.floor(focusedMs() / 60000)
  };
}
