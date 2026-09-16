/** What the toolbar's export button writes out when pressed. */
type ExportKind = "board" | "component" | "package" | "project";

/** The order the menu lists them in. */
const EXPORT_KINDS: ExportKind[] = ["project", "board", "component", "package"];

const DEFAULT_EXPORT_KIND: ExportKind = "board";

function isExportKind(value: unknown): value is ExportKind {
  return EXPORT_KINDS.includes(value as ExportKind);
}

/** As the button's tooltip and the menu name it. */
function exportKindLabel(kind: ExportKind): string {
  return `Export ${kind}`;
}

export {DEFAULT_EXPORT_KIND, EXPORT_KINDS, exportKindLabel, isExportKind};
export type {ExportKind};
