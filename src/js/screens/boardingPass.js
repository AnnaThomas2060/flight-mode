// BOARDING_PASS: one pass per leg, stacked for multi-leg trips (Section 5.4).
import * as state from '../state.js';
import * as store from '../store.js';
import { getRouteById, looseDuration } from '../flightMatch.js';

const SEAT_BY_CLASS = { economy: '23A', business: '4A', first: '1A' };
const GATE_LETTERS = 'ABCDE';

function gate() {
  return GATE_LETTERS[Math.floor(Math.random() * GATE_LETTERS.length)] +
         (1 + Math.floor(Math.random() * 32));
}

function flightNumber(routeId) {
  // stable, plausible-looking number derived from the route id
  let h = 0;
  for (const c of routeId) h = (h * 31 + c.charCodeAt(0)) % 900;
  return `FF ${100 + h}`;
}

export default function boardingPass(root, { navigate }) {
  const trip = state.getTrip();
  if (!trip) { navigate('home'); return; }
  const d = store.get();
  const seat = SEAT_BY_CLASS[d.activeSeatClass] || SEAT_BY_CLASS.economy;

  const passes = trip.legs.map((leg, i) => {
    const r = getRouteById(leg.routeId);
    return `
      <div class="boarding-pass">
        <div class="main">
          <div class="pass-header"><span>Flight Focus Air</span><span>Boarding pass</span></div>
          <div class="pass-route">
            <span>${r.origin}</span><span class="arrow">✈</span><span>${r.destination}</span>
          </div>
          <div class="pass-cities"><span>${r.originCity}</span><span>${r.destinationCity}</span></div>
          <div class="pass-meta">
            <div class="kv"><span class="k">Passenger</span><span class="v">${d.profile.name}</span></div>
            <div class="kv"><span class="k">Flight</span><span class="v">${flightNumber(r.id)}</span></div>
            <div class="kv"><span class="k">Gate</span><span class="v">${gate()}</span></div>
            <div class="kv"><span class="k">Seat</span><span class="v">${seat}</span></div>
            <div class="kv"><span class="k">Flight time</span><span class="v">${looseDuration(r.typicalMinutes)}</span></div>
          </div>
        </div>
        <div class="stub">
          ${trip.legs.length > 1 ? `<span class="leg-num">LEG ${i + 1} OF ${trip.legs.length}</span>` : '<span class="leg-num">NONSTOP</span>'}
          <div class="barcode"></div>
          <span class="leg-num">${r.origin}→${r.destination}</span>
        </div>
      </div>`;
  }).join('');

  const el = document.createElement('div');
  el.className = 'screen-pad';
  el.innerHTML = `
    <h2>Your ${trip.legs.length > 1 ? 'itinerary' : 'flight'} to ${trip.destinationCity}</h2>
    <div class="pass-stack">${passes}</div>
    <div style="display:flex;gap:10px">
      <button id="back">← Back to terminal</button>
      <button class="primary" id="board">Board now</button>
    </div>`;
  el.querySelector('#board').addEventListener('click', () => navigate('inflight'));
  el.querySelector('#back').addEventListener('click', () => { state.clearTrip(); navigate('home'); });
  root.appendChild(el);
}
