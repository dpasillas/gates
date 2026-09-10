import React from "react";

/**
 * Icons for the three things a project holds.
 *
 * Drawn as one family on a 24-unit grid with a 2-unit stroke, so that at the panel's 15px row size
 * they read as a set: a board is a framed circuit, a package is an empty housing with pins, and a
 * component is that same housing filled in. Fixed glyphs, deliberately not derived from anything
 * the board draws — an indicator has to look the same whatever the package symbol becomes.
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
function BoardIcon(props: IProps) {
  return (
    <Glyph {...props}>
      <rect x="3" y="3" width="18" height="18" rx="1.5"/>
      <circle cx="7" cy="12" r="2" fill="currentColor" stroke="none"/>
      <circle cx="17" cy="8" r="2" fill="currentColor" stroke="none"/>
      <circle cx="17" cy="16" r="2" fill="currentColor" stroke="none"/>
      <path d="M7 12h5M12 8v8M12 8h5M12 16h5" strokeWidth="1.8"/>
    </Glyph>
  );
}

const PINS = "M3 7h3M3 12h3M3 17h3M18 7h3M18 12h3M18 17h3";

/** An empty housing with three pins a side. */
function PackageIcon(props: IProps) {
  return (
    <Glyph {...props}>
      <rect x="6" y="4" width="12" height="16" rx="1"/>
      <path d={PINS}/>
    </Glyph>
  );
}

/** The same housing, filled in. */
function ComponentIcon(props: IProps) {
  return (
    <Glyph {...props}>
      <rect x="6" y="4" width="12" height="16" rx="1" fill="currentColor"/>
      <path d={PINS}/>
    </Glyph>
  );
}

export {BoardIcon, ComponentIcon, PackageIcon};
