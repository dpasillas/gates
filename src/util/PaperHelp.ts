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
  // Performance testing indicated that paperjs was spending a lot of time drawing the project.
  // This paperjs isn't being used to draw directly to a canvas, this is useless, so we make this a no-op.
  // @ts-ignore
  scope.project.draw = () => {}
  return scope;
}