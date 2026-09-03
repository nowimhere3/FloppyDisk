export const STATES = Object.freeze({
  EMPTY: "empty",
  READY: "ready",
  WORKING: "working",
  SUCCESS: "success",
  ERROR: "error",
});

/*
BREADCRUMBS - WAS: There was no public frontend.
BREADCRUMBS - IS: One reducer owns the five-state flow instead of event handlers owning visibility.
BREADCRUMBS - WILL BE: Extend these states rather than scattering UI state across the page.
*/
export function transition(state, event) {
  switch (event.type) {
    case "FILE_READY":
      return { name: STATES.READY, file: event.file, filename: event.filename, targetCount: event.targetCount };
    case "START":
      return state.name === STATES.READY
        ? { name: STATES.WORKING, startedAt: event.startedAt, phase: "starting", file: state.file }
        : state;
    case "RESUME":
      return { name: STATES.WORKING, startedAt: event.startedAt, phase: "checking" };
    case "PROGRESS":
      return state.name === STATES.WORKING ? { ...state, phase: event.phase } : state;
    case "COMPLETE":
      return { name: STATES.SUCCESS, result: event.result };
    case "FAIL":
      return { name: STATES.ERROR, message: event.message, file: state.file };
    case "RESET":
      return { name: STATES.EMPTY };
    default:
      return state;
  }
}
