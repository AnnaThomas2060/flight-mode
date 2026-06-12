// ARRIVAL: award points, update wallet/streak, write the Trip (Section 5.7).
import * as state from '../state.js';
import * as store from '../store.js';
import { scoreTrip, applyStreak, credit } from '../points.js';
import { getRouteById } from '../flightMatch.js';

export default function arrival(root, { navigate, props }) {
  const trip = state.getTrip();
  if (!trip) { navigate('home'); return; }
  const completedAll = Boolean(props.completedAll);
  const d = store.get();

  // Base points count only fully completed legs; an abandoned partial leg
  // earns nothing (Section 6.3).
  const completedMinutes = trip.legs
    .filter(l => l.completed)
    .reduce((s, l) => s + Math.round(l.plannedMinutes), 0);

  const score = scoreTrip({
    completedMinutes,
    totalFocusMinutes: trip.totalFocusMinutes,
    completedAll
  });
  const streakBonus = completedAll ? applyStreak(d.wallet) : 0;
  const totalEarned = score.total + streakBonus;
  credit(d.wallet, totalEarned);

  trip.completed = completedAll;
  trip.pointsEarned = totalEarned;
  d.trips.push({
    id: trip.id,
    date: new Date().toISOString(),
    origin: trip.origin,
    destination: trip.destination,
    routeIds: trip.legs.map(l => l.routeId),
    totalFocusMinutes: trip.totalFocusMinutes,
    legsCount: trip.legs.length,
    pointsEarned: totalEarned,
    completed: completedAll
  });
  // tasks persist across flights only if the setting says so (Section 5.10)
  if (!d.settings.tasksPersistAcrossFlights) {
    d.tasks = [];
    window.dispatchEvent(new Event('tasks-changed'));
  }
  store.save({ now: true });

  const lastRoute = getRouteById(trip.legs[completedAll ? trip.legs.length - 1 : Math.max(0, trip.currentLegIndex - 1)].routeId);
  const place = completedAll ? trip.destinationCity : (trip.legs.some(l => l.completed) ? lastRoute.destinationCity : trip.originCity);

  const el = document.createElement('div');
  el.className = 'screen-pad';
  el.innerHTML = `
    <div class="arrival-card">
      <div style="font-size:2.6rem">${completedAll ? '🛬' : '⚠️'}</div>
      <h1>${completedAll ? `You’ve landed in ${place}.` : 'Emergency landing.'}</h1>
      <p class="sub">${completedAll
        ? 'Smooth flight. Welcome to your destination.'
        : `You touched down early${completedMinutes ? ` — but ${completedMinutes} focused minutes still count` : ''}.`}</p>
      <div class="arrival-stats">
        <div class="kv"><div class="v">${completedMinutes}</div><div class="k">Minutes focused</div></div>
        <div class="kv"><div class="v">+${totalEarned}</div><div class="k">Miles earned</div></div>
        <div class="kv"><div class="v">${d.wallet.points.toLocaleString()}</div><div class="k">Balance</div></div>
        <div class="kv"><div class="v">${d.wallet.currentStreak}</div><div class="k">Day streak</div></div>
      </div>
      ${streakBonus ? `<p class="sub">Includes +${score.completionBonus} completion bonus and +${streakBonus} streak bonus.</p>`
        : completedAll && score.completionBonus ? `<p class="sub">Includes +${score.completionBonus} completion bonus.</p>` : ''}
      <div style="display:flex;gap:10px">
        <button class="primary" id="again">Plan another flight</button>
        <button id="home">Home</button>
      </div>
    </div>`;

  el.querySelector('#again').addEventListener('click', () => { state.clearTrip(); navigate('setup'); });
  el.querySelector('#home').addEventListener('click', () => { state.clearTrip(); navigate('home'); });
  root.appendChild(el);
}
