# Comments and documentation

## JSDoc vs line comments

The distinction is about audience, and it determines the syntax:

- **JSDoc**, written as `` /** ... */ `` — user-facing documentation. Anything a reader of the
  API should understand. Tooling parses it for editor hints, doc generation, and optimization.
- **Line comments**, written as `//` — implementation notes for someone reading the body.

Documentation placed in a `//` comment is invisible to tooling, so a caller hovering the
symbol in their editor never sees it. That is the practical reason the distinction matters.

## Multi-line comments

Use consecutive single-line comments rather than a block comment, indented to match the
surrounding code. Do not draw boxes around comments — the decoration adds nothing and every
edit has to preserve the alignment.

```
// This is the preferred form
// across multiple lines.

/* Not this
   style. */
```

## JSDoc form

Single line when it fits:

```
/** This short jsdoc describes the function. */
function doSomething(arg: number) { … }
```

Multi-line otherwise, with the opening `` /** `` and closing `` */ `` on their own lines:

```
/**
 * Multiple lines of JSDoc text are written here,
 * wrapped normally.
 * @param arg A number to do something to.
 */
function doSomething(arg: number) { … }
```

## No types in JSDoc

Do not write type annotations in JSDoc — no `@param {number} arg`, no `@return {string}`. The
type system already carries the types, and a duplicate goes stale the first time a signature
changes without the comment being updated. Describe *meaning*; let the signature carry the type.

## Markdown

JSDoc is rendered as Markdown, so plain-text formatting is silently collapsed. Use real
Markdown when structure matters:

```
// Bad — the list flattens into one line when rendered
/**
 * Factors:
 *   items sent
 *   items received
 */

// Good
/**
 * Factors:
 *
 * - items sent
 * - items received
 */
```

## Tags

Each tag goes on its own line, starting at the beginning of the line. Do not combine or
duplicate tags on a single line.

```
/**
 * @param left Left value
 * @param right Right value
 * @return The sum
 */
function add(left: number, right: number) { ... }
```

Document what is not evident from the signature: units, ownership, whether a parameter is
mutated, what happens on failure. A `@param` that restates the parameter name adds nothing
and costs a line.

## `@fileoverview`

A file may carry a top-level `@fileoverview` describing its contents, its purpose, or its
dependencies. It goes after any copyright block and before the imports.

## Consistency

Where the guide does not specify a choice, follow what the surrounding project already does.
A file whose comment style matches its neighbors is easier to read than one that is
individually more correct.
