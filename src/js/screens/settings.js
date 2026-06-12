// SETTINGS (Section 5.12): profile, flight prefs, audio defaults,
// export/import (the offline cloud-sync substitute) and reset.
import * as store from '../store.js';
import { updateHeader } from '../app.js';
import { confirmModal } from '../ui/modal.js';

export default function settings(root, { navigate }) {
  const d = store.get();
  const s = d.settings;

  root.innerHTML = `
    <div class="screen-pad">
      <div class="settings-card">
        <h1>Settings</h1>

        <h2>Profile</h2>
        <label class="field">Passenger name
          <input type="text" id="name" value="${d.profile.name}" maxlength="40" />
        </label>

        <h2>Flight</h2>
        <label class="field">Default break between legs (minutes)
          <input type="number" id="break" min="0" max="60" value="${s.defaultBreakMinutes}" />
        </label>
        <label class="field">Descent chime, minutes before landing
          <input type="number" id="ding" min="1" max="30" value="${s.descentDingLeadMinutes}" />
        </label>
        <label class="check"><input type="checkbox" id="reveal" ${s.revealTimeRemaining ? 'checked' : ''} />
          Show approximate time remaining in flight (off keeps the magic)</label>
        <label class="check"><input type="checkbox" id="persist" ${s.tasksPersistAcrossFlights ? 'checked' : ''} />
          Keep tasks after a flight lands</label>

        <h2>Audio</h2>
        <label class="field">Default music URL (YouTube)
          <input type="text" id="music-url" value="${s.musicPanelDefaultUrl}" spellcheck="false" />
        </label>
        <p class="sub small">Volume is controlled inside each player.</p>

        <h2>Data</h2>
        <div class="row-buttons">
          <button id="export">Export save…</button>
          <button id="import">Import save…</button>
          <button id="reset" class="danger">Reset all data</button>
        </div>
        <div class="field-error" id="data-msg"></div>

        <button id="back">← Back to terminal</button>
      </div>
    </div>`;

  const msg = root.querySelector('#data-msg');
  const bind = (sel, fn) => root.querySelector(sel).addEventListener('change', (e) => { fn(e); store.save(); });

  bind('#name', (e) => { d.profile.name = e.target.value.trim() || 'Traveler'; });
  bind('#break', (e) => { s.defaultBreakMinutes = Math.max(0, Number(e.target.value) || 0); });
  bind('#ding', (e) => { s.descentDingLeadMinutes = Math.min(30, Math.max(1, Number(e.target.value) || 5)); });
  bind('#reveal', (e) => { s.revealTimeRemaining = e.target.checked; });
  bind('#persist', (e) => { s.tasksPersistAcrossFlights = e.target.checked; });
  bind('#music-url', (e) => { s.musicPanelDefaultUrl = e.target.value.trim(); });

  root.querySelector('#export').addEventListener('click', async () => {
    store.save({ now: true }); // make sure the file on disk is current
    const res = await window.api.exportSave();
    msg.textContent = res.ok ? `Exported to ${res.path}` : (res.reason === 'canceled' ? '' : `Export failed: ${res.reason}`);
  });

  root.querySelector('#import').addEventListener('click', () => {
    confirmModal(root, {
      title: 'Import a save file?',
      body: 'This replaces your current profile, miles, tasks and history with the imported file.',
      confirmText: 'Import…',
      cancelText: 'Cancel',
      danger: true,
      onConfirm: async () => {
        const res = await window.api.importSave();
        if (res.ok) {
          store.replace(res.data);
          updateHeader();
          window.dispatchEvent(new Event('tasks-changed'));
          navigate('settings'); // re-render with imported values
        } else if (res.reason !== 'canceled') {
          msg.textContent = `Import failed: ${res.reason}`;
        }
      }
    });
  });

  root.querySelector('#reset').addEventListener('click', () => {
    confirmModal(root, {
      title: 'Reset all data?',
      body: 'Miles, unlocks, tasks, history and settings all go back to zero. This cannot be undone.',
      confirmText: 'Reset everything',
      cancelText: 'Keep my data',
      danger: true,
      onConfirm: () => {
        store.reset();
        updateHeader();
        window.dispatchEvent(new Event('tasks-changed'));
        navigate('home');
      }
    });
  });

  root.querySelector('#back').addEventListener('click', () => navigate('home'));
}
