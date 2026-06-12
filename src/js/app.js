// Bootstraps the app; owns the router (Section 4 state machine).
import * as store from './store.js';
import { startClock } from './ui/clock.js';
import home from './screens/home.js';
import setup from './screens/setup.js';
import cutscene from './screens/cutscene.js';
import boardingPass from './screens/boardingPass.js';
import inflight from './screens/inflight.js';
import layover from './screens/layover.js';
import arrival from './screens/arrival.js';
import shop from './screens/shop.js';
import logbook from './screens/logbook.js';
import settings from './screens/settings.js';
import { mountTaskPanel } from './ui/taskPanel.js';

const screens = { home, setup, cutscene, boardingPass, inflight, layover, arrival, shop, logbook, settings };

const root = document.getElementById('screen');
let cleanup = null; // active screen's teardown (stops engines, intervals)

export function navigate(name, props = {}) {
  if (typeof cleanup === 'function') cleanup();
  cleanup = null;
  root.innerHTML = '';
  const screen = screens[name];
  if (!screen) { console.error('unknown screen', name); return; }
  cleanup = screen(root, { navigate, props }) || null;
  updateHeader();
}

const SEAT_LABEL = { economy: 'Economy', business: 'Business', first: 'First Class' };

export function updateHeader() {
  const d = store.get();
  if (!d) return;
  document.getElementById('wallet-chip').textContent = `${d.wallet.points.toLocaleString()} mi`;
  document.getElementById('seat-chip').textContent = SEAT_LABEL[d.activeSeatClass] || d.activeSeatClass;
}

(async function boot() {
  await store.init();
  startClock(document.getElementById('clock'));
  mountTaskPanel(); // sticky-note checklist, docked right on every screen
  // Re-broadcast powerMonitor suspend/resume so progress engines can
  // subscribe/unsubscribe per leg without stacking IPC listeners.
  window.api.onPower((s) => window.dispatchEvent(new CustomEvent('power', { detail: s })));
  navigate('home');
})();
