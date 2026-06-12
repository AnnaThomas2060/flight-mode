// In-memory app state (Section 4). The current Trip lives here while the
// state machine moves HOME → SETUP → BOARDING_PASS → INFLIGHT → … → ARRIVAL.

let trip = null;

export function setTrip(t) { trip = t; }
export function getTrip() { return trip; }
export function clearTrip() { trip = null; }

export function currentLeg() {
  return trip ? trip.legs[trip.currentLegIndex] : null;
}

export function hasMoreLegs() {
  return trip ? trip.currentLegIndex < trip.legs.length - 1 : false;
}

// Session-only flag: the cutscene becomes skippable after the first view.
export let seenCutscene = false;
export function setSeenCutscene() { seenCutscene = true; }
