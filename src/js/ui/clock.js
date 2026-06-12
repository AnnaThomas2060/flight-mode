// Top-right live wall-clock (time of day). This is the ONLY Date-based
// display in the app — all flight timing is monotonic (Section 9).

export function startClock(el) {
  const tick = () => {
    el.textContent = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };
  tick();
  setInterval(tick, 1000);
}
