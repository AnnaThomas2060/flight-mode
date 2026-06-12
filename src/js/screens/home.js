// HOME / Terminal (Section 5.1).
export default function home(root, { navigate }) {
  const el = document.createElement('div');
  el.className = 'screen-pad';
  el.innerHTML = `
    <div class="home-hero">
      <div class="terminal-art">🛫</div>
      <h1>Flight Focus</h1>
      <p class="sub">Turn your next focus session into a flight. No countdowns —
      just you, a window seat, and somewhere to be.</p>
      <button class="primary" data-act="plan">Plan a flight</button>
      <nav class="home-nav">
        <button data-act="shop">Shop</button>
        <button data-act="logbook">Logbook</button>
        <button data-act="settings">Settings</button>
      </nav>
    </div>`;
  el.querySelector('[data-act="plan"]').addEventListener('click', () => navigate('setup'));
  ['shop', 'logbook', 'settings'].forEach(name =>
    el.querySelector(`[data-act="${name}"]`).addEventListener('click', () => navigate(name)));
  root.appendChild(el);
}
