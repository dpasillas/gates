import React from "react";

import {OR_PATH, PIN_PATH} from "../Constants";

/**
 * Icons for the side rail tabs.
 *
 * All of them draw in `currentColor` so the rail's selected and hover states tint them without any
 * extra wiring, and all render at the same optical size as the mock's 18px rail glyphs.
 */

/** Folder, for the project tree. */
function ProjectIcon() {
  return (
    <svg viewBox="0 0 640 640" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M128 464L512 464C520.8 464 528 456.8 528 448L528 208C528 199.2 520.8 192 512 192L362.7
               192C345.4 192 328.5 186.4 314.7 176L276.3 147.2C273.5 145.1 270.2 144 266.7 144L128
               144C119.2 144 112 151.2 112 160L112 448C112 456.8 119.2 464 128 464zM512 512L128
               512C92.7 512 64 483.3 64 448L64 160C64 124.7 92.7 96 128 96L266.7 96C280.5 96 294
               100.5 305.1 108.8L343.5 137.6C349 141.8 355.8 144 362.7 144L512 144C547.3 144 576
               172.7 576 208L576 448C576 483.3 547.3 512 512 512z"/>
    </svg>
  );
}

/**
 * An OR gate with stubbed pins, for the parts drawer.
 *
 * The body reuses the same path the board draws gates with, offset to leave room for the pins, so
 * the icon stays in step with the real rendering rather than being a lookalike.
 */
function PartsIcon() {
  return (
    <svg viewBox="-2 -2 52 36" width="18" height="12" fill="none" stroke="currentColor"
         strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <mask id="or_mask">
            <rect x="-2" y="-2" width="52" height="36" fill="white"/>
            <path d={OR_PATH} transform="translate(6,0)" fill="black"/>
        </mask>
        <g mask="url(#or_mask)">
            <path d={PIN_PATH} transform="translate(26, 16)"/>
            <path d={PIN_PATH} transform="translate(20, 8) rotate(180)"/>
            <path d={PIN_PATH} transform="translate(20, 24) rotate(180)"/>
        </g>
        <path d={OR_PATH} transform="translate(6,0)"/>
    </svg>
  );
}

/** Sliders, the conventional glyph for adjustable settings. */
function PropertiesIcon() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor"
         strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
      <path d="M3 6 H10 M15 6 H17 M3 14 H6 M11 14 H17"/>
      <circle cx="12.5" cy="6" r="2.2"/>
      <circle cx="8.5" cy="14" r="2.2"/>
    </svg>
  );
}

export {ProjectIcon, PartsIcon, PropertiesIcon};
