import React from "react";

import {ExportKind} from "../util/exportKind";

/**
 * Icons for the things a project holds.
 *
 * Drawn as one family on a 24-unit grid with a 2-unit stroke, so that at the panel's 15px row size
 * they read as a set: a board is a framed circuit, a package is an empty housing with pins, a
 * component is that same housing filled in, and the project is the folder they sit in. Fixed
 * glyphs, deliberately not derived from anything the board draws — an indicator has to look the
 * same whatever the package symbol becomes.
 */

interface IProps {
  className?: string;
  /** Read out and shown on hover, for a row that names the thing some other way. */
  title?: string;
}

function Glyph({className, title, children}: IProps & {children: React.ReactNode}) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="1em" height="1em"
         fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"
         strokeLinecap="round" role={title ? "img" : undefined} aria-hidden={title ? undefined : true}>
      {title && <title>{title}</title>}
      {children}
    </svg>
  );
}

/** A framed circuit: one node fanning out to two. */
const BOARD = (
  <>
    <rect x="3" y="3" width="18" height="18" rx="1.5"/>
    <circle cx="7" cy="12" r="2" fill="currentColor" stroke="none"/>
    <circle cx="17" cy="8" r="2" fill="currentColor" stroke="none"/>
    <circle cx="17" cy="16" r="2" fill="currentColor" stroke="none"/>
    <path d="M7 12h5M12 8v8M12 8h5M12 16h5"/>
  </>
);

const PINS = "M3 7h3M3 12h3M3 17h3M18 7h3M18 12h3M18 17h3";

/** An empty housing with three pins a side. */
const PACKAGE = (
  <>
    <rect x="6" y="4" width="12" height="16" rx="1"/>
    <path d={PINS}/>
  </>
);

/** The same housing, filled in. */
const COMPONENT = (
  <>
    <rect x="6" y="4" width="12" height="16" rx="1" fill="currentColor"/>
    <path d={PINS}/>
  </>
);

/** A folder. */
const PROJECT = (
  <path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4.6l2.4 2.4h8A1.5 1.5 0 0 1 21 8.9v8.6a1.5 1.5 0 0 1-1.5
           1.5h-15A1.5 1.5 0 0 1 3 17.5z"/>
);

const GLYPHS: Record<ExportKind, React.ReactElement> = {
  board: BOARD,
  package: PACKAGE,
  component: COMPONENT,
  project: PROJECT,
};

function BoardIcon(props: IProps) {
  return <Glyph {...props}>{BOARD}</Glyph>;
}

function PackageIcon(props: IProps) {
  return <Glyph {...props}>{PACKAGE}</Glyph>;
}

function ComponentIcon(props: IProps) {
  return <Glyph {...props}>{COMPONENT}</Glyph>;
}

/** Where the badge sits: hanging off the picture's top-right corner, half outside the frame. */
const BADGE = {cx: 18.5, cy: 5.5, size: 12, clearance: 7.8};

/** Every export icon cuts the same hole, so one mask serves however many are drawn. */
const BADGE_MASK = "export-icon-badge";

/**
 * A picture, badged with the kind of thing the export button will write out.
 *
 * The badge is one of the family above at half size, on a stroke thick enough to survive the
 * shrinking, and the picture is cut away around it so the two never touch.
 */
function ExportIcon({kind, ...props}: IProps & {kind: ExportKind}) {
  const {cx, cy, size, clearance} = BADGE;

  return (
    <svg className={props.className} viewBox="0 0 24 24" width="1em" height="1em" overflow="visible"
         fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"
         strokeLinecap="round" aria-hidden="true">
      <mask id={BADGE_MASK}>
        <rect x="-2" y="-2" width="28" height="28" fill="white"/>
        <circle cx={cx} cy={cy} r={clearance} fill="black"/>
      </mask>
      <g mask={`url(#${BADGE_MASK})`}>
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <circle cx="8.5" cy="8.5" r="1.6" fill="currentColor" stroke="none"/>
        <path d="M21 15.5l-4.5-4.5-7 7"/>
        <path d="M3 17l4-4 3.5 3.5"/>
      </g>
      <svg x={cx - size / 2} y={cy - size / 2} width={size} height={size} viewBox="0 0 24 24"
           strokeWidth="3.2" overflow="visible" className={`export-icon-badge-${kind}`}>
        {GLYPHS[kind]}
      </svg>
    </svg>
  );
}

export {BoardIcon, ComponentIcon, ExportIcon, PackageIcon};
