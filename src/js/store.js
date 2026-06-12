// Load/save profile+wallet+trips+tasks via the preload API (Section 3).
// Load once on startup; keep in memory; debounce-save on meaningful changes.

const SAVE_DEBOUNCE_MS = 400;

let data = null;
let saveTimer = null;

function defaults() {
  return {
    version: 1,
    profile: { name: 'Traveler', avatar: null, createdAt: new Date().toISOString() },
    wallet: {
      points: 0, lifetimePoints: 0,
      currentStreak: 0, longestStreak: 0,
      lastSessionDate: null
    },
    unlocks: [],
    activeSeatClass: 'economy',
    tasks: [],
    trips: [],
    settings: {
      musicPanelDefaultUrl: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
      ambienceDefaultUrl: 'https://www.youtube-nocookie.com/embed/co7KgV2edvI',
      revealTimeRemaining: false,
      ambienceVolume: 0.6, musicVolume: 0.5,
      tasksPersistAcrossFlights: true,
      descentDingLeadMinutes: 5,
      defaultBreakMinutes: 5
    }
  };
}

export async function init() {
  let loaded = null;
  try {
    loaded = await window.api.load();
  } catch { /* fall through to defaults */ }
  // Missing/corrupt file → fresh default save, never crash (Section 3).
  if (!loaded || typeof loaded !== 'object' || loaded.version !== 1) {
    data = defaults();
    save();
  } else {
    // Backfill any settings added after the save was created.
    data = loaded;
    data.settings = { ...defaults().settings, ...(data.settings || {}) };
  }
  return data;
}

export function get() {
  return data;
}

/** Debounced persist; pass {now: true} to flush immediately (e.g. trip complete). */
export function save({ now = false } = {}) {
  clearTimeout(saveTimer);
  if (now) {
    window.api.save(data);
  } else {
    saveTimer = setTimeout(() => window.api.save(data), SAVE_DEBOUNCE_MS);
  }
}

/** Swap in an imported save (already written to disk by the main process). */
export function replace(newData) {
  data = newData;
  data.settings = { ...defaults().settings, ...(data.settings || {}) };
}

/** Reset everything to a fresh default save. */
export function reset() {
  data = defaults();
  save({ now: true });
}
