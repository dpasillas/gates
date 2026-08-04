# Type system

## Type inference

**Rely on inference for trivially inferable types** — string, number, boolean, regex literals,
and `new` expressions. An annotation there restates what is already obvious and becomes one
more thing to keep in sync.

```
const x = 15;                    // Good — obviously a number
const y: number = 15;            // Unnecessary
const s = new Set<string>();     // Type parameter needed: nothing to infer from
```

**Annotate when the expression is complex**, or when inference would produce a type wider or
narrower than you intend.

**Return type annotations are optional.** Add one when the return type is complex, or when you
want the compiler to catch a future edit that quietly changes what the function returns — the
annotation turns a silent API change into a local error.

## `null` and `undefined`

Either may be used; the right choice is contextual. Much of the JavaScript standard library
signals absence with `undefined` (`Map.get`), while DOM APIs generally use `null`
(`Element.getAttribute`). Match the convention of whatever you are interoperating with.

**Type aliases must not include `|null` or `|undefined`.** Bake nullability into an alias and
every consumer inherits it, including the ones that have a value in hand.

```
// Bad
type CoffeeResponse = Latte|Americano|undefined;

// Good — nullability belongs at the use site
type CoffeeResponse = Latte|Americano;

class CoffeeService {
  getLatte(): CoffeeResponse|undefined { ... }
}
```

**Prefer optional syntax over `|undefined`** for fields and parameters. `milk?: string` says
"may be absent"; `milk: string|undefined` additionally requires callers to pass something.

```
interface Order {
  milk?: string;
}

function pour(volume?: number) { ... }
```

## Structural typing

TypeScript types are structural: a value matches a type when it has the right properties, not
because it was declared to implement it.

**When you intend a value to satisfy a type, annotate it at declaration.** Otherwise the value
gets its own inferred type and errors surface far from the mistake.

```
// Good — mismatches are reported here
const foo: Foo = {a: 123, b: 'abc'};

// Bad — inferred independently; errors appear wherever it is used
const badFoo = {a: 123, b: 'abc'};
```

**Use interfaces, not classes, to define structural types.** A class carries an
implementation and a runtime identity you do not need when you only want a shape.

## Interfaces vs type aliases

**For object types, prefer `interface`.** Interfaces produce better error messages and better
compiler performance; the TypeScript team's own position is that there is no upside to a type
alias for an object type given the display and performance costs.

```
// Good
interface User {
  firstName: string;
  lastName: string;
}

// Avoid for object types
type User = {
  firstName: string;
  lastName: string;
};
```

Type aliases remain the right tool for unions, tuples, function types, and anything that is
not an object shape.

## Array types

For simple element types — alphanumeric with dots — use the shorthand `T[]` or `readonly T[]`,
including multi-dimensional (`T[][]`). For anything more complex, use `Array<T>`, because the
suffix form becomes hard to parse.

```
let a: string[];
let b: readonly string[];
let d: string[][];
let e: Array<{n: number, s: string}>;
let f: Array<string|number>;
```

## Index signatures and `Map`/`Set`

Index signatures model associative arrays. Give the key a descriptive label — it is
documentation only, but it is the only place the key's meaning can be recorded:

```
const users: {[userName: string]: number} = ...;
```

**Prefer `Map` and `Set` over index-signature objects.** They have fewer prototype surprises,
support non-string keys, and separate "has this key" from "has this property" cleanly.

## Mapped and conditional types

Use the simplest construct that works. The guide's reasoning is worth quoting in spirit: a
little repetition or verbosity is usually much cheaper than the long-term cost of a complex
type expression. Mapped and conditional types resist refactoring tools, defeat plain-text
search, and have an evaluation model most readers cannot simulate in their head.

```
// Prefer an explicit interface
interface FoodPreferences {
  favoriteIcecream: string;
  favoriteChocolate: string;
}

// Over a derived type
type FoodPreferences = Pick<User, 'favoriteIcecream'|'favoriteChocolate'>;
```

## `any`

**Avoid `any`.** In order of preference:

1. **Give it a real type** — an interface, a type alias, or an inline object type.
2. **Use `unknown`** when the value is genuinely opaque. `unknown` is safe because it forbids
   dereferencing anything until you narrow, so the check happens where the knowledge is.
3. **Suppress the lint warning with a comment** explaining why neither of the above works.

```
// Bad — every downstream use is unchecked, silently
const danger: any = value;
danger.whoops();

// Good — the compiler makes you establish what it is first
const val: unknown = value;
```

The cost of `any` is that it does not stay local: values derived from it are also unchecked,
so one `any` at a boundary can disable checking across a whole call path.

## Tuple types

Prefer a tuple to a purpose-built interface for pair-like returns:

```
function splitInHalf(input: string): [string, string] {
  return [x, y];
}

const [left, right] = splitInHalf('...');
```

Destructuring at the call site gives the parts meaningful names locally. When the members need
names that travel with the type, use an inline object type or an interface instead.

## Wrapper types

Never use `String`, `Boolean`, or `Number` as types, and never invoke them as constructors.
Use `string`, `boolean`, `number`.

Use `{}` for "anything except `null` and `undefined`", and lowercase `object` to additionally
exclude primitives (`string`, `number`, `boolean`, `symbol`, `bigint`).

## Return-type-only generics

Avoid APIs whose type parameter appears only in the return type — the caller's annotation
silently decides what the function claims to produce, with nothing checking it. When calling
an existing API shaped this way, specify the type parameter explicitly rather than letting it
be inferred from context.

## Type assertions

Both `as` casts and `!` non-null assertions override the compiler, so they need justification.

- Prefer a **runtime check** that narrows the type honestly.
- Use the **`as` syntax**, not angle brackets (which collide with JSX).
- For a double assertion, go **through `unknown`** rather than chaining directly.
- When you do assert, a short comment explaining why the assertion is sound is what makes it
  reviewable later.

## Toolchain

All TypeScript must pass type checking with the project's standard toolchain.

**Do not use `@ts-ignore`, `@ts-expect-error`, or `@ts-nocheck`** to silence compiler errors.
They mask a problem that is better addressed directly, and `@ts-nocheck` disables checking for
an entire file.

The one carve-out: `@ts-expect-error` may appear in unit tests, sparingly. When suppression is
truly unavoidable, prefer an explicit cast with a comment so the escape hatch is scoped to a
single expression rather than a region.

Google TypeScript is additionally subject to conformance frameworks (tsetse, tsec) that
enforce security-critical restrictions — no `eval`, no assignment to `innerHTML`, and similar.
