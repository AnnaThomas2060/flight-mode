// LOGBOOK (Section 5.9): past trips + lifetime stats.
import * as store from '../store.js';

export default function logbook(root, { navigate }) {
  const d = store.get();
  const trips = [...d.trips].reverse();

  const rows = trips.map(t => `
    <tr class="${t.completed ? '' : 'early'}">
      <td>${new Date(t.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}</td>
      <td>${t.origin} → ${t.destination}${t.legsCount > 1 ? ` <span class="legs-chip">${t.legsCount} legs</span>` : ''}</td>
      <td>${t.totalFocusMinutes} min</td>
      <td>+${t.pointsEarned}</td>
      <td>${t.completed ? '🛬 Landed' : '⚠️ Early'}</td>
    </tr>`).join('');

  const totalMinutes = d.trips.reduce((s, t) => s + (t.completed ? t.totalFocusMinutes : 0), 0);
  const hours = (totalMinutes / 60).toFixed(1);

  root.innerHTML = `
    <div class="screen-pad">
      <h1>Logbook</h1>
      ${trips.length ? `
        <div class="logbook-table-wrap">
          <table class="logbook">
            <thead><tr><th>Date</th><th>Route</th><th>Focus</th><th>Miles</th><th></th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>` : '<p class="sub">No flights yet. Your journey starts at the terminal.</p>'}
      <div class="arrival-stats">
        <div class="kv"><div class="v">${hours}</div><div class="k">Focus hours</div></div>
        <div class="kv"><div class="v">${d.trips.length}</div><div class="k">Trips</div></div>
        <div class="kv"><div class="v">${d.wallet.longestStreak}</div><div class="k">Longest streak</div></div>
        <div class="kv"><div class="v">${d.wallet.lifetimePoints.toLocaleString()}</div><div class="k">Lifetime miles</div></div>
      </div>
      <button id="back">← Back to terminal</button>
    </div>`;
  root.querySelector('#back').addEventListener('click', () => navigate('home'));
}
