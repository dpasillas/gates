# Naming, file structure, imports and exports

## Identifiers

| Style | Applies to |
|---|---|
| `UpperCamelCase` | classes, interfaces, types, enums, decorators, type parameters |
| `lowerCamelCase` | variables, parameters, functions, methods, properties, module aliases |
| `CONSTANT_CASE` | global constants and enum values |

**Acronyms are words.** `loadHttpUrl`, not `loadHTTPURL`. Consistent casing means you can
predict an identifier's spelling without knowing whether a fragment happens to be an acronym.

**Forbidden decorations.** No leading or trailing underscores (`_foo`, `foo_`), no `opt_`
prefix for optional parameters, no Hungarian notation. TypeScript's visibility modifiers and
the optional `?` marker already express what these conventions were invented to express.

> **Sanctioned deviation in this project:** `I`-prefixed names for module-private interfaces
> (`IProps`, `IState`, `IParams`) are accepted and should not be flagged. Exported interfaces
> still take qualified, unprefixed names. See "Sanctioned deviations" in `SKILL.md`.

**Descriptive names.** Names must be clear about what they hold. Ambiguous abbreviations are
allowed only when the variable's whole scope is under about ten lines, because the reader can
take in its entire lifetime at once. `n` in a three-line loop is fine; `n` as a class field
is not.

**Test method names** in xUnit-style frameworks *may* use `_` separators to encode structure:
`testX_whenY_doesZ()`. This is one of the few places underscores are sanctioned.

## Constants and CONSTANT_CASE

`CONSTANT_CASE` signals that a value is deeply immutable and module-level — not merely that
it was declared with `const`. A `const` holding a mutable object that gets mutated is not a
constant in this sense and takes `lowerCamelCase`.

## File encoding and whitespace

- Source files are **UTF-8**.
- The only whitespace character permitted outside line terminators is the ASCII space
  (0x20). Other whitespace inside strings must be escaped, so that invisible characters
  cannot change behavior without being visible in review.
- Prefer named escapes (`\'`, `\"`, `\\`, `\n`, `\r`, `\t`, `\b`, `\f`, `\v`) over numeric
  ones. For non-ASCII text, prefer the actual Unicode character when it aids readability.

## Source file structure

Files have these sections in order, separated by exactly one blank line:

1. Copyright information, if present
2. `@fileoverview` JSDoc, if present
3. Imports
4. Implementation

A top-level `@fileoverview` *may* describe the file's contents, its uses, or its dependencies.

## Imports

Four forms, each with its own use:

```
import * as foo from './foo';        // module (namespace) import
import {Foo} from './foo';           // named import
import Foo from 'foo';               // default import — from external code only
import './foo';                      // side-effect import
```

- **Named imports** for a handful of specific symbols. **Namespace imports** for large APIs,
  where a prefix keeps the origin of each symbol obvious at the call site.
- TypeScript code **must** use paths to import other TypeScript code. Use relative paths
  (`./foo`) within a project; limit how far parent references (`../../../`) reach, since a
  deep chain breaks whenever a file moves.
- Use **`import type`** when a symbol is only ever used in type position, and `export type`
  for type-only re-exports. This lets the compiler erase the import entirely.

## Exports

- **Named exports only. Do not use default exports.** A default export has no canonical
  name, so each importer picks its own and the same symbol acquires several names across the
  codebase, defeating search and refactoring.

  ```
  // Good
  export class Foo { ... }

  // Bad
  export default class Foo { ... }
  ```

- **Minimize export visibility.** Export only what is used outside the file. Anything
  exported is API you have implicitly promised to keep working.
- **Do not use mutable exports** (`export let x`). Consumers cannot observe reassignment
  reliably, so the value they see depends on timing.
- **Do not use container classes** that exist only to hold static methods. Export the
  functions directly — a class used as a namespace adds a layer with no behavior.

## Modules, not namespaces

Use ES6 modules. Do not use `namespace Foo {}` or `require()`. Namespaces predate modules
and produce global-ish scope with none of the tooling benefits.

## Decorators

Only decorators defined by a framework are permitted — Angular's `@Component`, `@NgModule`,
Polymer's `@property`, and their like. **Do not define new decorators**; their semantics are
still shifting and they obscure control flow.

A decorator **must** immediately precede the symbol it decorates, with no blank line between.

## Enums

- Use plain `enum`. **`const enum` must not be used** — it is erased at compile time, which
  makes the enum invisible to JavaScript consumers of the module.
- Enum values take `CONSTANT_CASE`, since they are module-level constants.
- Do not coerce enum values to booleans with `Boolean(x)` or `!!x`. Compare explicitly
  against the member you mean, because an enum's zero value is falsy and that is almost never
  the distinction you intended.
