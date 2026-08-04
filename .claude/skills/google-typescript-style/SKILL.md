---
name: google-typescript-style
description: The Google TypeScript Style Guide — naming, imports/exports, classes and functions, the type system (any vs unknown, interfaces vs type aliases, null vs undefined, inference), JSDoc, and banned language features. Use this whenever writing new TypeScript, reviewing or refactoring .ts/.tsx code, deciding between two ways to express something in TypeScript, or answering questions about TS conventions — including when the user never says "Google" and just asks for idiomatic or clean TypeScript.
---

# Google TypeScript Style Guide

This encodes https://google.github.io/styleguide/tsguide.html. It applies to `.ts` and `.tsx`.

A style guide's value is that it settles arguments cheaply. Most of these rules are not
claims that one form is objectively better — they are decisions already made, so nobody
has to relitigate them in review. Where the guide gives a reason, this skill keeps it,
because knowing *why* a rule exists tells you how to handle the cases it does not cover.

## How strong is each rule

The guide is written with deliberate normative levels, and they mean different things:

| Level | What to do |
|---|---|
| **must** / **must not** | Non-negotiable. Do not write code that violates these. |
| **should** / **should not** | Strong default. Deviate only for a concrete reason, and say what it is. |
| **may** | Genuinely your call. Do not treat as a requirement or flag it in review. |

When you flag something in review, name the level. "Should prefer `for...of` here" invites
a judgment call; "must not use `var`" does not. Reporting a *may* as a defect wastes the
author's time and makes the rest of your review easier to dismiss.

## The rule that outranks the others: be consistent

The guide says explicitly that when it does not specify a choice, be consistent within the
project. Two practical consequences:

- **Match the surrounding code**, even when you would have chosen differently on a blank
  page. A file that mixes two conventions is worse than a file that consistently uses the
  one you like less.
- **Do not churn existing code into compliance** as a side effect of an unrelated change.
  Fix style in code you are already editing for another reason. A diff that mixes a bug fix
  with fifty naming changes is hard to review and hard to revert. If a codebase is broadly
  non-compliant, raise it as its own piece of work rather than smuggling it in.

## Sanctioned deviations in this project

These override the guide here. They are deliberate decisions, not oversights — **do not flag
them in review, and follow them when writing new code.**

### `I`-prefixed interface names are accepted

The guide bans Hungarian-notation prefixes, but this codebase uses `IProps`, `IState`, and
`IParams` for module-private interfaces, consistently, across 33 declarations. The convention
is unambiguous in practice because these interfaces are file-local, and renaming them would
cost a repo-wide diff for no functional gain.

One boundary worth respecting, because the codebase already draws it: **exported interfaces do
not take the prefix.** They use qualified, unprefixed names — `GateProps`, `PinProps`,
`LogicComponentParams`, `UpdateGeometryParams`, `InteractionParams`, `GateEventHandlers`. So
when adding an interface, the question is whether it is exported:

```ts
interface IProps { ... }                    // module-private — prefixed
export interface LogicComponentParams { ... }  // exported — qualified, no prefix
```

Writing `IGateProps` for an exported interface would be wrong under both conventions.

## The rules that come up constantly

These cover the large majority of real TypeScript. Everything else is in `references/`.

1. **`const` by default, `let` only when reassigned, never `var`.** `var` is function-scoped
   and hoists, which produces bugs the block-scoped forms cannot.
2. **Named exports only — no default exports.** Default exports have no canonical name, so
   importers invent their own and the same symbol ends up with several names across a codebase.
3. **Avoid `any`.** Reach for a real type first; use `unknown` when the value is genuinely
   opaque. `any` disables checking silently and the damage spreads to everything it touches,
   whereas `unknown` forces a narrowing step at the point of use.
4. **Prefer interfaces over type aliases for object types** — better error messages, better
   compiler performance.
5. **Prefer optional `?` over `|undefined`** on fields and parameters. Type aliases must not
   bake in `|null` or `|undefined`; add nullability where the type is *used*, so one alias
   can serve both nullable and non-nullable positions.
6. **Let trivially inferable types infer** (string, number, boolean, regex, `new` expressions);
   annotate when the type is complex or when inference would produce something too wide.
7. **`===` and `!==` always.** The single exception the guide grants: `== null`, which
   deliberately matches both `null` and `undefined`.
8. **No `@ts-ignore`, `@ts-nocheck`, or `@ts-expect-error`** to paper over compiler errors.
   They hide a real problem rather than fixing it. (`@ts-expect-error` is tolerated sparingly
   in unit tests.) If you must suppress, prefer a narrow cast with a comment explaining why.
9. **JSDoc for anything a caller should read; line comments for implementation notes.**
   JSDoc is written `` /** ... */ ``, line comments `//`. Tooling extracts JSDoc, so putting
   API documentation in a line comment hides it from readers.
10. **Never use the wrapper types `String`, `Boolean`, `Number`** as types or constructors.
    Use `string`, `boolean`, `number`.
11. **Throw only `Error` instances** (`throw new Error(...)`), and catch as `unknown`.
    Non-`Error` throws lose the stack trace.
12. **`for...of` over `for...in`.** `for...in` walks inherited enumerable keys and hands you
    strings; it is for dict-style objects only, and then filter with `hasOwnProperty`.
13. **Prefer `Map` and `Set` over objects with index signatures** — fewer prototype surprises,
    and keys need not be strings.
14. **No type annotations in JSDoc.** The type system already carries them, and a duplicated
    type silently goes stale.

## Naming

| Style | Applies to |
|---|---|
| `UpperCamelCase` | classes, interfaces, types, enums, decorators, type parameters |
| `lowerCamelCase` | variables, parameters, functions, methods, properties, module aliases |
| `CONSTANT_CASE` | global constants and enum values |

Treat acronyms as words: `loadHttpUrl`, not `loadHTTPURL`. No trailing or leading
underscores, no `opt_` prefixes, no Hungarian notation. Names must be descriptive;
abbreviations are acceptable only for variables whose scope is under ~10 lines, because a
reader can see the whole lifetime at once.

## What this guide deliberately does not cover

**Formatting.** The public guide mandates no formatter and specifies no column limit — it
mentions `clang-format` only as an example of a tool with limited ASI support, which is why
statements must be explicitly semicolon-terminated. So do not invent formatting rules or
reformat code in this guide's name. Follow whatever the project already uses (Prettier
config, editor settings, or the surrounding file's evident habits).

If asked to enforce "Google style" on formatting specifically, say that the public guide is
silent on it and ask what the project uses.

## Reference material

Read the file that covers what you are actually working on rather than all of them:

| File | Read it when |
|---|---|
| `references/naming-and-files.md` | naming decisions, file structure, imports/exports, decorators, enums |
| `references/language-features.md` | classes, functions, `this`, control flow, literals, banned features |
| `references/type-system.md` | type design — inference, nullability, generics, `any`/`unknown`, arrays, tuples |
| `references/comments-and-jsdoc.md` | writing or reviewing documentation comments |

## Reviewing against this guide

When reviewing, prioritize by what actually causes harm:

1. **Correctness-adjacent rules first** — `any`, suppressed compiler errors, non-`Error`
   throws, `==`, `var`, mutable exports. These hide bugs.
2. **Interface-shaped rules next** — export style, nullability in type aliases, wrapper
   types, `interface` vs `type`. These are expensive to change once other code depends on them.
3. **Local style last** — naming, comment form. Cheap to fix, low cost if missed.

Do not produce a review that is a flat list of every deviation. A reviewer who reports six
naming nits and misses an `any` on a public API has made the code worse, not better.
