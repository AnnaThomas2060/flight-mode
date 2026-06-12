// Route matching + multi-leg splitting (Section 6.1).
import routes from '../data/routes.js';

// Tunable: max focus minutes per leg before a trip splits into multiple legs.
// Raised from the spec's 50 per user feedback: a requested duration should
// match ONE flight of similar length; breaks/legs only apply to marathon
// sessions longer than this.
export const MAX_LEG = 240;

// A matched route must be within ±this of the requested time (user spec:
// "2 hours" → 1h30–2h30). Scales to 25% for long sessions where the route
// dataset is sparser.
const MATCH_WINDOW_MIN = 30;

const MIN_TRAILING_LEG = 5;   // legs shorter than this merge into the previous one
const TOP_N_RANDOMIZE = 5;    // randomize among the N closest matches so repeats vary

function matchesDeparture(route, departure) {
  if (!departure) return false;
  const q = departure.trim().toLowerCase();
  if (!q) return false;
  return route.origin.toLowerCase() === q || route.originCity.toLowerCase().includes(q);
}

/** Routes sorted by closeness of typicalMinutes to `minutes`. */
function byCloseness(minutes, pool) {
  return [...pool].sort((a, b) =>
    Math.abs(a.typicalMinutes - minutes) - Math.abs(b.typicalMinutes - minutes));
}

function matchWindow(minutes) {
  return Math.max(MATCH_WINDOW_MIN, minutes * 0.25);
}

/** Weighted random pick among the candidates closest to `minutes`. */
function pickClosest(minutes, pool) {
  const top = byCloseness(minutes, pool).slice(0, TOP_N_RANDOMIZE);
  const totalWeight = top.reduce((s, r) => s + (r.weight || 1), 0);
  let roll = Math.random() * totalWeight;
  for (const r of top) {
    roll -= (r.weight || 1);
    if (roll <= 0) return r;
  }
  return top[0];
}

/** Pick a route near `minutes`. The DEPARTURE CITY wins over duration:
 *  a flight from the user's city with an off-target duration beats a
 *  perfect-duration flight from somewhere else (the leg's progress runs on
 *  plannedMinutes either way — the route label is scenery). */
function pickRoute(minutes, from) {
  const win = matchWindow(minutes);
  const inWindow = (r) => Math.abs(r.typicalMinutes - minutes) <= win;
  const local = routes.filter(r => matchesDeparture(r, from));

  let pool = local.filter(inWindow);
  if (!pool.length) pool = local;                 // right city, closest duration
  if (!pool.length) pool = routes.filter(inWindow); // unknown city: right duration
  if (!pool.length) pool = routes;
  return pickClosest(minutes, pool);
}

/** Next leg of a multi-leg itinerary: must depart where the previous leg
 *  landed. Relax the no-revisit rule, then the duration, before ever
 *  breaking continuity (only possible if an airport were a dead end). */
function pickConnection(minutes, prevLeg, used, visited) {
  const fromAirport = getRouteById(prevLeg.routeId).destination;
  const departing = routes.filter(r => r.origin === fromAirport && !used.has(r.id));

  let pool = departing.filter(r => !visited.has(r.destination));
  if (!pool.length) pool = departing;
  if (!pool.length) pool = routes.filter(r => !used.has(r.id)); // dead end (shouldn't happen)
  return pickClosest(minutes, pool);
}

/** Shortest real flight in the dataset (for the "too short" warning). */
export function shortestFlightMinutes() {
  return Math.min(...routes.map(r => r.typicalMinutes));
}

/** True when no real flight is anywhere near this duration — even the
 *  shortest hop is outside the match window. */
export function tooShortForFlight(focusMinutes) {
  return focusMinutes < shortestFlightMinutes() - matchWindow(focusMinutes);
}

export function getRouteById(id) {
  return routes.find(r => r.id === id) || null;
}

/** All unique cities + codes, for the setup datalist. */
export function departureSuggestions() {
  const seen = new Set();
  const out = [];
  for (const r of routes) {
    if (!seen.has(r.originCity)) { seen.add(r.originCity); out.push(r.originCity); }
  }
  return out.sort();
}

/**
 * buildTrip({ focusMinutes, departure, breakMinutes }) -> Trip (Section 4).
 * Each leg's plannedMinutes is the focus time allocated to that leg — it
 * drives progress, independent of the route's nominal duration on the pass.
 */
export function buildTrip({ focusMinutes, departure, breakMinutes }) {
  const legs = [];

  // One flight matched to the full duration is the default; legs/breaks only
  // apply to marathon sessions (> MAX_LEG) where the user wants breaks.
  if (focusMinutes <= MAX_LEG || breakMinutes <= 0) {
    const route = pickRoute(focusMinutes, departure);
    legs.push(makeLeg(route, focusMinutes));
  } else {
    let n = Math.ceil(focusMinutes / MAX_LEG);
    let per = focusMinutes / n;
    // Merge a trailing leg shorter than MIN_TRAILING_LEG into the previous leg.
    if (n > 1 && per < MIN_TRAILING_LEG) { n -= 1; per = focusMinutes / n; }

    // Chain a REAL connecting itinerary: leg 1 departs the user's city; every
    // later leg departs the airport the previous one landed at. Never reuse a
    // route, and avoid flying back to an airport already on the itinerary.
    const used = new Set();
    const visited = new Set();
    for (let i = 0; i < n; i++) {
      const route = i === 0
        ? pickRoute(per, departure)
        : pickConnection(per, legs[i - 1], used, visited);
      used.add(route.id);
      visited.add(route.origin);
      visited.add(route.destination);
      legs.push(makeLeg(route, per));
    }
  }

  const first = getRouteById(legs[0].routeId);
  const last = getRouteById(legs[legs.length - 1].routeId);

  return {
    id: crypto.randomUUID(),
    origin: first.origin,
    originCity: first.originCity,
    destination: last.destination,
    destinationCity: last.destinationCity,
    breakMinutes,
    totalFocusMinutes: focusMinutes,
    legs,
    currentLegIndex: 0,
    pointsEarned: 0,
    completed: false
  };
}

function makeLeg(route, plannedMinutes) {
  return {
    routeId: route.id,
    plannedMinutes,
    startedAt: null,
    actualMinutes: 0,
    completed: false
  };
}

/** "~1h 30m" style label for the boarding pass (loosely phrased, Section 5.4). */
export function looseDuration(minutes) {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `~${m}m`;
  if (m === 0) return `~${h}h`;
  return `~${h}h ${m}m`;
}
