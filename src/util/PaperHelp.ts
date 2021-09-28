import paper from "paper";

/**
 * Creates and sets up a paper scope
 *
 * Primarily intended to allow initializing scopes inline as class or global variables.
 * */
export function makeAndSetupScope() {
  let scope = new paper.PaperScope();
  // @ts-ignore
  scope.setup();
  return scope;
}