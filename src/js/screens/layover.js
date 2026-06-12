// LAYOVER between legs (Section 5.6). Unlike flights, the break MAY show a
// countdown — it's a rest, not a focus session. Boarding music arrives in M3.
import * as state from '../state.js';
import { getRouteById } from '../flightMatch.js';

export default function layover(root, { navigate }) {
  const trip = state.getTrip();
  if (!trip) { navigate('home'); return; }

  const arrivedRoute = getRouteById(trip.legs[trip.currentLegIndex - 1].routeId);
  const nextRoute = getRouteById(state.currentLeg().routeId);
  let secondsLeft = trip.breakMinutes * 60;

  const el = document.createElement('div');
  el.className = 'screen-pad';
  el.innerHTML = `
    <div class="layover-card">
      <h2>Layover in ${arrivedRoute.destinationCity}</h2>
      <p class="sub">Stretch your legs. Next leg: ${nextRoute.origin} → ${nextRoute.destination}
      (${nextRoute.destinationCity}).</p>
      <div class="layover-count" id="count"></div>
      <button class="primary" id="board">Board now</button>
    </div>`;

  const count = el.querySelector('#count');
  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  function tick() {
    count.textContent = fmt(Math.max(0, secondsLeft));
    if (secondsLeft <= 0) { navigate('inflight'); return; }
    secondsLeft -= 1;
  }
  tick();
  const intervalId = setInterval(tick, 1000);

  el.querySelector('#board').addEventListener('click', () => navigate('inflight'));
  root.appendChild(el);

  return () => clearInterval(intervalId);
}
