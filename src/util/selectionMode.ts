/** How an interaction combines what it picks up with what was already selected. */
enum SelectionMode {
  /** What the interaction picks up becomes the selection. */
  REPLACE,
  /** What the interaction picks up joins the selection. */
  ADD,
  /** What the interaction picks up leaves the selection. */
  SUBTRACT,
  /** What the interaction picks up joins the selection if it was out of it, and leaves if it was in. */
  TOGGLE,
}

/** Which modifier the user is holding, from any event that reports modifier state. */
function selectionModeFor(e: {getModifierState(key: string): boolean}): SelectionMode {
  if (e.getModifierState("Shift")) {
    return SelectionMode.ADD;
  }
  if (e.getModifierState("Alt")) {
    return SelectionMode.SUBTRACT;
  }
  if (e.getModifierState("Control")) {
    return SelectionMode.TOGGLE;
  }

  return SelectionMode.REPLACE;
}

export {SelectionMode, selectionModeFor};
