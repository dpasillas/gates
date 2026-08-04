# Language features

## Variable declarations

- **`const` by default; `let` only when the binding is reassigned; never `var`.** `var` is
  function-scoped and hoists, so it produces bugs that block-scoped declarations cannot.
- **One variable per declaration.** `let a = 1, b = 2;` is harder to scan and easy to
  misedit.

## Array literals

- **Do not use the `Array` constructor.** `new Array(3)` and `new Array(3, 4)` mean entirely
  different things, which is a bug waiting to happen. Use `[]`, `[1, 2]`, or `Array.from()`
  when you need a sized array.
- **Do not add non-numeric properties to arrays** (other than `length`). Use a `Map` or an
  object — an array with string keys confuses every consumer and most tooling.
- **Spreading**: only spread iterables into arrays. Do not spread `null`, `undefined`, or
  primitives.
- **Destructuring** is fine. Omit elements you do not need, and give destructured parameters
  defaults where that reads well.

## Object literals

- **Do not use the `Object` constructor.** Use `{}` or `{a: 0, b: 1}`.
- **Iteration**: do not use unfiltered `for...in` over objects — it walks inherited
  enumerable keys. Prefer `for...of` over `Object.keys()`, `Object.values()`, or
  `Object.entries()`.
- **Spreading**: spread objects into objects only. Avoid spreading objects with a non-`Object`
  prototype, since the prototype is not carried along and the result is a different kind of
  thing than it appears.
- **Computed properties** are for symbols and dict-style keys. Do not mix quoted and unquoted
  keys in one literal — the mix implies a distinction that is not there.
- **Destructuring** is permitted in assignments and parameters. Keep parameter destructuring
  shallow; deep or computed destructuring in a signature hides what the function requires.

## Classes

- **No semicolon after a class declaration**; a class *expression* used as a statement is
  terminated with one. Methods are separated by a single blank line and take no semicolons
  between them.
- **Do not use private identifiers (`#field`).** Use TypeScript's `private` — the two have
  different semantics, and mixing them in one codebase is confusing.
- **`readonly`** on every property never reassigned after construction. It documents intent
  and the compiler enforces it.
- **Parameter properties** are the preferred way to avoid threading constructor arguments
  into fields by hand:

  ```
  class Foo {
    constructor(private readonly bar: Bar) {}
  }
  ```

- **Field initializers**: initialize at the declaration where you can. Often this removes the
  need for a constructor at all.
- **Visibility**: as restricted as possible. Do not write `public` — it is the default — with
  the single exception of a non-`readonly` public parameter property, where the modifier is
  required syntax. Members reached from outside the class (a template, for instance) need
  `protected` or `public`.
- **Constructors** always take parentheses, even with no arguments. Omit an empty constructor
  unless it carries parameter properties, visibility modifiers, or decorators.
- **Getters and setters**: getters must be pure — no observable side effects. A reader expects
  property access to be free of consequences. Do not define accessors via
  `Object.defineProperty`.
- **Static methods**: avoid private static methods; a module-local function is simpler. Do not
  rely on dynamic dispatch of statics, and do not use `this` in a static context.
- **Do not manipulate prototypes** directly outside framework code.

## Functions

- **Prefer function declarations** for named functions (`function foo() {}`) over assigning a
  function expression to a variable — declarations hoist and carry a name in stack traces.
- **Do not use function expressions**; use arrow functions. The exceptions are when you must
  dynamically rebind `this`, and generators.
- **Arrow body form**: concise body when you want the value, block body otherwise. Do not let
  a value leak out of an arrow whose contract is `void` — a concise body returns whatever the
  last expression evaluated to, which can silently satisfy the wrong overload.
- **Nested functions**: declarations or arrows as fits. Inside methods, arrows are usually
  right because they inherit `this`.
- **Rebinding `this`**: do not use `this` in an ordinary function. Do not work around it with
  `bind()` or `const self = this` — use an arrow function or pass what you need as a parameter.
- **Arrow functions as properties**: generally avoid, since they obscure where `this` comes
  from. Legitimate when binding for a template, or when a handler must later be uninstalled.
- **Event handlers**: an arrow function is fine when the handler is never removed. When it
  must be removed, store it as an arrow-function property so you hold a stable reference. Do
  not call `bind()` at installation time — the bound function is a new object each call, and
  you can never remove it.
- **Parameter initializers** are allowed for optional parameters, but must have no observable
  side effects and should stay simple.
- **Rest and spread**: use rest parameters rather than `arguments`, and spread rather than
  `Function.prototype.apply()`. No space after `...`.
- **Generators**: attach the star to the keyword — `` function* ``, `` yield* ``.
- No blank line at the very start or end of a function body; single blank lines inside for
  logical grouping are fine.

## `this`

Use `this` only in:

- class constructors and methods,
- functions with an explicit `this` parameter type,
- arrow functions defined in a scope where `this` is already meaningful.

Do not use `this` to reach the global object, an `eval` context, or an event target.

## Primitive literals

- **Strings**: single quotes for ordinary strings. Template literals (backticks) for
  interpolation, complex concatenation, or multi-line text.
- **No backslash line continuations** inside strings — leading whitespace on the next line
  becomes part of the string, invisibly.
- **Numbers**: lowercase prefixes `0x`, `0o`, `0b`. No leading zeros otherwise.
- **Coercion**: use `String(x)` and `Boolean(x)`, or a template literal, to convert. Use
  `Number(x)` to parse and check the result for `NaN`. Do not use unary `+`, and do not use
  `parseInt`/`parseFloat` except for parsing a non-base-10 string.
- **Implicit coercion in conditionals** (`if (x)`, `while (x)`) is idiomatic and allowed. Enums
  are the exception: compare an enum explicitly, since its zero member is falsy.

## Control structures

- **Braces on all control flow statements**, even single statements. The exception is a
  complete `if` written on one line. Braces prevent the classic bug where a second statement
  is added later and silently falls outside the branch.
- **Avoid assignment inside a condition.** If you truly want it, wrap it in an extra pair of
  parentheses to show the assignment is deliberate.
- **Iterating**: `for...of` is the default for arrays. `forEach` and index loops are fine.
  `for...in` is for dict-style objects only, filtered with `hasOwnProperty` — or replaced by
  `for...of` over `Object.keys()`.
- **Grouping parentheses**: omit them only when there is no chance of misreading and their
  absence does not hurt readability. Relying on the reader to recall the precedence table is
  not worth the characters saved.
- **Switch**: a `default` case is required and comes last. Every non-empty case ends in
  `break`, `return`, or `throw` — no fallthrough. Empty cases may fall through, which is how
  you group several labels.
- **Equality**: `===` and `!==`. The one exception is `== null`, used deliberately to match
  both `null` and `undefined`.

## Exception handling

- Instantiate errors with `new Error(...)`.
- **Throw only `Error` instances.** Throwing a string or object loses the stack trace.
- **Catch as `unknown`** and narrow before use — a `catch` binding can be anything, since any
  value can be thrown by code you do not control.
- An **empty catch block requires a comment** explaining why swallowing is correct. Silent
  empty catches are one of the most reliable sources of undiagnosable bugs.
- Keep `try` blocks tight around the code that actually throws, so the `catch` cannot
  accidentally capture an error from unrelated code.

## Disallowed

- **Wrapper object construction**: never `new String(...)`, `new Boolean(...)`,
  `new Number(...)`. These produce objects, so `new Boolean(false)` is truthy.
- **Reliance on Automatic Semicolon Insertion.** Terminate every statement explicitly. This
  prevents ASI-related bugs and keeps compatibility with tools whose ASI support is limited
  (the guide names `clang-format`).
- **`const enum`** — use a plain `enum`.
- **`debugger` statements** in production code.
- **`with`**.
- **Dynamic code evaluation**: `eval()` and `new Function(...string)`.
- **Non-standard features**: deprecated ECMAScript features, unshipped proposals, and
  transpiler-specific extensions.
- **Modifying builtins**: never patch builtin types or their prototypes; avoid adding symbols
  to the global object unless there is no alternative.

Type assertions (`as`, `!`) are covered in `type-system.md`.
