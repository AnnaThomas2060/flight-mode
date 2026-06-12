// INFLIGHT: the primary scene (Section 5.5). Layered window-seat view, an SVG
// route line as the ONLY progress indicator (no countdown anywhere), pause /
// end-early controls, descent ding, and the YouTube ambience panel.
import * as state from '../state.js';
import * as store from '../store.js';
import { getRouteById } from '../flightMatch.js';
import { createProgressEngine } from '../progress.js';
import { confirmModal } from '../ui/modal.js';
import { mountMusicPanel } from '../ui/musicPanel.js';

const CLOUDS = [
  { top: '14%', w: 90, h: 22, dur: 55, delay: 0 },
  { top: '30%', w: 140, h: 30, dur: 75, delay: -20 },
  { top: '48%', w: 70, h: 18, dur: 48, delay: -35 },
  { top: '62%', w: 110, h: 24, dur: 90, delay: -10 }
];

/** Cabin lighting follows the USER'S local time of day:
 *  daytime → lights high (0), night → lights low (1), with dawn/dusk ramps.
 *  Display-only ambience — flight timing stays monotonic. */
function localNightness(date = new Date()) {
  const h = date.getHours() + date.getMinutes() / 60;
  if (h < 5) return 1;            // deep night
  if (h < 7) return 1 - (h - 5) / 2;  // dawn ramp
  if (h < 18) return 0;           // day
  if (h < 20) return (h - 18) / 2;    // dusk ramp
  return 1;                       // night
}

export default function inflight(root, { navigate }) {
  const trip = state.getTrip();
  if (!trip) { navigate('home'); return; }
  const d = store.get();
  const leg = state.currentLeg();
  const route = getRouteById(leg.routeId);

  // top-down airliner silhouette, nose pointing right, centered on (0,0)
  const PLANE_PATH = 'M 14 0 C 13.2 -1.4 11.5 -2 9.5 -2 L 4 -2 L -2.5 -9 L -5.5 -9 ' +
    'L -2 -2 L -7.5 -1.5 L -9.5 -3.5 L -11.5 -3.5 L -10.2 0 L -11.5 3.5 L -9.5 3.5 ' +
    'L -7.5 1.5 L -2 2 L -5.5 9 L -2.5 9 L 4 2 L 9.5 2 C 11.5 2 13.2 1.4 14 0 Z';

  // Class-specific arrangement, modeled on the photos in references/:
  // economy = seatback of the row ahead (blue fabric, vest sticker), your
  //           laptop on its fold-down tray, two windows on the left wall;
  // business = Emirates-style cream pod: wood console, minibar, water glass;
  // first = bright white suite: three windows, ottoman with red pillow,
  //         lamp cabinet, white desk, champagne.
  const cls = d.activeSeatClass;

  const windowUnit = (i, showWing) => `
    <div class="window-unit w${i}">
      <div class="window-glow"></div>
      <div class="window-sky">
        <div class="night"></div>
        <div class="stars"></div>
        ${CLOUDS.map(c => `<div class="cloud" style="top:${c.top};width:${c.w}px;height:${c.h}px;
          animation-duration:${c.dur}s;animation-delay:${c.delay - i * 17}s"></div>`).join('')}
        ${showWing ? `
        <svg class="wing" viewBox="0 0 100 50" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="wing-grad-${i}" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stop-color="#aab0b9"/>
              <stop offset="0.55" stop-color="#c6cbd2"/>
              <stop offset="1" stop-color="#8e959f"/>
            </linearGradient>
          </defs>
          <path d="M 0 50 L 0 22 C 28 16 58 11 83 11 L 85 4 L 87 4 L 86.5 12 C 70 18 35 32 0 50 Z"
                fill="url(#wing-grad-${i})"/>
          <circle class="navlight" cx="86" cy="6" r="1.3" fill="#ff5b4d"/>
        </svg>` : ''}
      </div>
      ${cls !== 'economy' ? '<div class="shade-dots"><i></i><i></i><i></i></div>' : ''}
    </div>`;

  const windowCount = cls === 'first' ? 3 : 2;
  const windows = Array.from({ length: windowCount },
    (_, i) => windowUnit(i, i === 0)).join('');

  const el = document.createElement('div');
  el.className = `scene ${cls}`;
  el.innerHTML = `
    <div class="side-wall">${windows}</div>

    ${cls === 'economy' ? `
      <div class="economy-seatback"></div>` : ''}
    ${cls === 'business' ? `
      <div class="pod-shell"></div>
      <div class="minibar"><i></i><i></i><i></i></div>
      <div class="menu-card"></div>
      <div class="coaster"></div>
      <div class="tumbler"></div>` : ''}
    ${cls === 'first' ? `
      <div class="suite-wall"></div>
      <div class="ottoman"><div class="pillow"></div></div>
      <div class="cabinet"></div>
      <div class="table-tray"></div>
      <div class="welcome-card"></div>
      <div class="bud-vase"><i class="vstem"></i><i class="bloom"></i></div>
      <div class="side-lamp">
        <span class="shade"></span><span class="stem"></span><span class="lbase"></span>
        <span class="glow"></span>
      </div>
      <div class="flute">
        <span class="bowl"><i class="bubble b1"></i><i class="bubble b2"></i><i class="bubble b3"></i></span>
        <span class="fstem"></span><span class="fbase"></span>
      </div>` : ''}

    <div class="my-seat"></div>
    ${cls === 'economy' ? '<div class="armrest left"></div><div class="armrest right"></div>' : ''}
    <div class="work-surface"></div>
    <div class="laptop">
      <div class="lid">
        <div class="doc">
          <div class="doc-bar"><i></i><i></i><i></i><span>deep-work.md</span></div>
          <div class="doc-page">
            <div class="line"></div><div class="line"></div><div class="line"></div>
            <div class="line"></div><div class="line"></div><div class="line"></div>
            <div class="line"></div>
          </div>
        </div>
      </div>
      <div class="base"></div>
    </div>

    <div class="route-progress">
      <svg viewBox="0 0 600 56" preserveAspectRatio="none" aria-hidden="true">
        <path id="route-line" d="M 8 46 Q 300 -14 592 46" fill="none"
              stroke="rgba(255,255,255,0.25)" stroke-width="2" stroke-dasharray="5 6"/>
        <path id="route-done" d="M 8 46 Q 300 -14 592 46" fill="none"
              stroke="#f5b942" stroke-width="2.5"/>
        <g id="plane-icon">
          <path d="${PLANE_PATH}" fill="#ffffff" stroke="rgba(10,18,30,0.4)" stroke-width="0.6"/>
        </g>
      </svg>
      <div class="codes">
        <span>${route.origin} · ${route.originCity}</span>
        ${d.settings.revealTimeRemaining ? '<span id="remaining"></span>' : ''}
        <span>${route.destination} · ${route.destinationCity}</span>
      </div>
    </div>

    <div class="flight-controls">
      <button id="pause">⏸ Pause</button>
      <button id="end" class="danger">End early</button>
      <button id="mini">— Minimize</button>
    </div>`;
  root.appendChild(el);

  // ---- audio panels (YouTube embeds; never block the flight — Section 5.11) ----
  mountMusicPanel(el, d.settings);

  // ---- progress drives the plane along the route path ----
  const line = el.querySelector('#route-line');
  const done = el.querySelector('#route-done');
  const plane = el.querySelector('#plane-icon');
  const remaining = el.querySelector('#remaining');
  const pathLen = line.getTotalLength();
  done.style.strokeDasharray = String(pathLen);
  done.style.strokeDashoffset = String(pathLen);

  function renderProgress(p) {
    const pt = line.getPointAtLength(p * pathLen);
    const ahead = line.getPointAtLength(Math.min(pathLen, p * pathLen + 1));
    const angle = Math.atan2(ahead.y - pt.y, ahead.x - pt.x) * 180 / Math.PI;
    plane.setAttribute('transform', `translate(${pt.x},${pt.y}) rotate(${angle}) scale(1.15)`);
    done.style.strokeDashoffset = String(pathLen * (1 - p));
    if (remaining) {
      const mins = Math.ceil((1 - p) * leg.plannedMinutes);
      remaining.textContent = p >= 1 ? 'landing…' : `≈ ${mins} min remaining`;
    }
  }
  renderProgress(0);

  // cabin lighting tracks the user's local time (re-checked each minute)
  const applyLighting = () => el.style.setProperty('--nightness', String(localNightness()));
  applyLighting();
  const lightingId = setInterval(applyLighting, 60000);

  leg.startedAt = new Date().toISOString();

  const engine = createProgressEngine({
    plannedMinutes: leg.plannedMinutes,
    descentLeadMinutes: d.settings.descentDingLeadMinutes,
    onTick: renderProgress,
    onDescent: () => {
      playDescentChime();
      window.api.notify('Cabin crew, prepare for landing',
        'Your flight is almost over.');
    },
    onComplete: () => {
      leg.completed = true;
      leg.actualMinutes = Math.round(leg.plannedMinutes);
      if (state.hasMoreLegs()) {
        trip.currentLegIndex += 1;
        navigate(trip.breakMinutes > 0 ? 'layover' : 'inflight');
      } else {
        navigate('arrival', { completedAll: true });
      }
    }
  });

  // ---- controls ----
  const pauseBtn = el.querySelector('#pause');
  let veil = null;
  pauseBtn.addEventListener('click', () => {
    if (engine.isPaused()) {
      engine.resume();
      pauseBtn.textContent = '⏸ Pause';
      veil?.remove(); veil = null;
    } else {
      engine.pause();
      pauseBtn.textContent = '▶ Resume';
      veil = document.createElement('div');
      veil.className = 'paused-veil';
      veil.textContent = 'PAUSED';
      el.appendChild(veil);
    }
  });

  el.querySelector('#mini').addEventListener('click', () => window.api.minimize());

  el.querySelector('#end').addEventListener('click', () => {
    confirmModal(el, {
      title: 'Request an emergency landing?',
      body: 'You’ll keep base miles for fully completed legs, but lose the completion bonus.',
      confirmText: 'Land now',
      cancelText: 'Keep flying',
      danger: true,
      onConfirm: () => navigate('arrival', { completedAll: false })
    });
  });

  return () => { engine.stop(); clearInterval(lightingId); };
}

// ---- helpers ----

/** Soft two-tone airline chime, synthesized — no audio asset needed. */
function playDescentChime() {
  try {
    const ctx = new AudioContext();
    [[880, 0], [660, 0.45]].forEach(([freq, at]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + at);
      gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + at + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + at + 1.1);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + at);
      osc.stop(ctx.currentTime + at + 1.2);
    });
    setTimeout(() => ctx.close(), 2500);
  } catch { /* audio unavailable — the OS notification still fires */ }
}
