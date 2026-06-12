// SETUP: collect focusMinutes, departure, breakMinutes (Section 5.2).
import { buildTrip, departureSuggestions, tooShortForFlight, shortestFlightMinutes } from '../flightMatch.js';
import * as state from '../state.js';
import * as store from '../store.js';
import { confirmModal } from '../ui/modal.js';

// 25 dropped: the shortest real flight in the dataset is 45 minutes.
const FOCUS_CHIPS = [45, 60, 90, 120];
const BREAK_CHIPS = [0, 5, 10, 15];
const MIN_FOCUS = 5, MAX_FOCUS = 720;

export default function setup(root, { navigate }) {
  const el = document.createElement('div');
  el.className = 'screen-pad';
  el.innerHTML = `
    <div class="setup-card">
      <h2>Plan your flight</h2>

      <label class="field">Focus duration (minutes)
        <input type="number" id="focus" min="${MIN_FOCUS}" max="${MAX_FOCUS}" value="50" />
        <div class="chips" id="focus-chips">
          ${FOCUS_CHIPS.map(m => `<button type="button" data-min="${m}">${m} min</button>`).join('')}
        </div>
      </label>

      <label class="field">Departure location
        <input type="text" id="departure" list="cities" placeholder="e.g. New York" autocomplete="off" />
        <datalist id="cities">
          ${departureSuggestions().map(c => `<option value="${c}"></option>`).join('')}
        </datalist>
      </label>

      <label class="field">Break length (between legs)
        <div class="chips" id="break-chips">
          ${BREAK_CHIPS.map(m => `<button type="button" data-min="${m}">${m === 0 ? 'None' : m + ' min'}</button>`).join('')}
        </div>
      </label>

      <div class="field-error" id="err"></div>
      <div style="display:flex;gap:10px;justify-content:center">
        <button id="back">← Back to terminal</button>
        <button class="primary" id="submit">Find my flight ✈</button>
      </div>
    </div>`;

  const focusInput = el.querySelector('#focus');
  const departureInput = el.querySelector('#departure');
  const err = el.querySelector('#err');
  const submit = el.querySelector('#submit');
  let breakMinutes = store.get().settings.defaultBreakMinutes ?? 5;

  function syncChips(container, value) {
    container.querySelectorAll('button').forEach(b =>
      b.classList.toggle('active', Number(b.dataset.min) === value));
  }

  function validate() {
    const v = Number(focusInput.value);
    const ok = Number.isFinite(v) && v >= MIN_FOCUS && v <= MAX_FOCUS;
    err.textContent = ok || focusInput.value === '' ? '' : `Focus must be ${MIN_FOCUS}–${MAX_FOCUS} minutes.`;
    submit.disabled = !ok;
    syncChips(el.querySelector('#focus-chips'), v);
  }

  el.querySelector('#focus-chips').addEventListener('click', (e) => {
    const m = e.target.dataset?.min;
    if (m) { focusInput.value = m; validate(); }
  });
  el.querySelector('#break-chips').addEventListener('click', (e) => {
    const m = e.target.dataset?.min;
    if (m !== undefined) { breakMinutes = Number(m); syncChips(el.querySelector('#break-chips'), breakMinutes); }
  });
  focusInput.addEventListener('input', validate);

  function takeOff() {
    const trip = buildTrip({
      focusMinutes: Number(focusInput.value),
      departure: departureInput.value,
      breakMinutes
    });
    state.setTrip(trip);
    navigate('cutscene');
  }

  submit.addEventListener('click', () => {
    const focus = Number(focusInput.value);
    if (tooShortForFlight(focus)) {
      confirmModal(root, {
        title: 'That’s a quick hop!',
        body: `No real flight is that short — the shortest in our network is about
          ${shortestFlightMinutes()} minutes. You can still take off: your session stays
          ${focus} minutes, boarded on the closest short hop.`,
        confirmText: 'Fly anyway',
        cancelText: 'Pick a longer time'
      , onConfirm: takeOff });
      return;
    }
    takeOff();
  });

  el.querySelector('#back').addEventListener('click', () => navigate('home'));

  syncChips(el.querySelector('#break-chips'), breakMinutes);
  validate();
  root.appendChild(el);
  focusInput.focus();
}
