// CUTSCENE (Section 5.3): split-flap departures board resolving onto the
// matched destination. ~4s; skippable after first view this session.
import * as state from '../state.js';
import { getRouteById } from '../flightMatch.js';

const FLAP_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ ';
const SETTLE_MS = 90;   // per-letter settle stagger
const HOLD_MS = 1400;   // pause on the resolved board before boarding pass

export default function cutscene(root, { navigate }) {
  const trip = state.getTrip();
  if (!trip) { navigate('home'); return; }

  const dest = trip.destinationCity.toUpperCase();
  const via = trip.legs.length > 1
    ? 'via ' + trip.legs.slice(0, -1).map(l => getRouteById(l.routeId).destination).join(' · ')
    : '';

  const el = document.createElement('div');
  el.className = 'cutscene';
  el.innerHTML = `
    <div class="board">
      <div class="board-title">DEPARTURES</div>
      <div class="board-row" id="flap-row">
        ${[...dest].map(() => `<span class="flap">&nbsp;</span>`).join('')}
      </div>
      <div class="board-sub">${via}</div>
      <div class="board-sub blink">NOW BOARDING</div>
    </div>
    ${state.seenCutscene ? '<button id="skip" class="skip-btn">Skip ›</button>' : ''}`;
  root.appendChild(el);

  const flaps = [...el.querySelectorAll('.flap')];
  const timers = [];
  let advanced = false;
  const advance = () => {
    if (advanced) return;
    advanced = true;
    state.setSeenCutscene();
    navigate('boardingPass');
  };

  // each letter cycles randomly, settling left-to-right like a split-flap board
  flaps.forEach((flap, i) => {
    const target = dest[i];
    const spin = setInterval(() => {
      flap.textContent = FLAP_CHARS[Math.floor(Math.random() * FLAP_CHARS.length)];
    }, 50);
    timers.push(spin);
    timers.push(setTimeout(() => {
      clearInterval(spin);
      flap.textContent = target === ' ' ? ' ' : target;
      flap.classList.add('set');
      if (i === flaps.length - 1) timers.push(setTimeout(advance, HOLD_MS));
    }, 900 + i * SETTLE_MS));
  });

  el.querySelector('#skip')?.addEventListener('click', advance);

  return () => timers.forEach(t => { clearInterval(t); clearTimeout(t); });
}
