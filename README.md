# Class Mixin in TypeScript

Mixins are the type of structure in software development that allows them be included in a more composition way rather than inheritance.
The closest analogy is if `class User implements Person, Profile { }` would actually implement the properties and methods.

As `implements` is a TypeScript feature, it doesn't exist in runtime, that's why this library relies on `extends` behavior.
Though it still looks readable - `class User extends mixin(Person, Profile) { }`.

There is an alternative [`ts-mixer`](http://npmjs.com/package/ts-mixer), but this library tries to achive more native feeling,
like `mixin` is actually a part of JavaScript/TypeScript.

## Install

```bash
bun i class-mixin-instance
```

## Example

```ts
import { mixin } from "class-mixin-instance"

class Person {
  name!: string
  age!: number

  private gender!: "aircraft"
}

class Profile {
  name!: string
  avatar!: string

  protected something!: {}
}

export class User extends mixin(Person, Profile) {
  id!: number

  asd() {
    this.gender // => Error: Property is private
    this.something
  }
}


const user = new User
user.gender // => Error: Property is private
user.something // => Error: Property is protected

user instanceof User // === true
user instanceof Person // === true
user instanceof Profile // === true
user instanceof mixin(Person, Profile) // === true
```

## Specification

- a mixin class can define properties and methods.
- a mixin class can define public/protected/private visibility.
- a mixin class can define a constructor.
- a mixin class can't define constructor arguments.
- a mixin doesn't have to be extended.
- mixin classes types must match each other, otherwise error will be shown at `extends mixin(Person, Profile)`.
- a class that extends a mixin can be checked with `instanceof` for each class and altogether.

### Type per class

When inspecting a property from a mixin, your IDE will display what this type belongs to.
<img width="612" height="194" alt="image" src="https://github.com/user-attachments/assets/b2b3a4bc-58ff-44fb-a4c7-6cf4433686ab" />

### Type `super`

When inspecting `super`, your IDE will display the mixins.

<img width="618" height="182" alt="image" src="https://github.com/user-attachments/assets/334b31fc-00e5-4fdd-b255-4fcd0390abbc" />

## Decorators

Decorators should work as intended.

```ts
const META = Symbol("meta")
function mark(kind: string) {
  return (target: any, prop: string) => {
    target[META] ??= []
    target[META].push(`${kind}-${prop}`)
  }
}

class Alpha {
  @mark("alpha") foo!: string
}

class Beta {
  @mark("beta") bar!: string
}

class Both extends mixin(Alpha, Beta) {}
console.log(Both.prototype[META]) // => ["alpha-foo","beta-bar"]
```

Decorated members with the same name from different classes are all
preserved, the mixed prototype simply contains both pieces of metadata.

## Standalone Invocation


`mixin(A, B, C)` can be invoked itself as a class, which would result in an object that shares `A`, `B`, `C` classes.

```ts
const mixed = new mixin(A, B, C)
// Or

const Mixed = mixin(A, B, C)
const mixed = new Mixed
```

## Notes on implementation

- The mixin helper **generates a new class on first invocation** for the provided constructors and caches the result. Subsequent calls with the same sequence return the *same* class reference, so `instanceof` checks remain cheap and class identity is preserved.
- When a mixed class is created, its prototype is constructed immediately by copying all properties (including symbol keys) from each base class. This ensures any metadata created by decorators lives on the mixed prototype as well.
- Static members and other non‑prototype properties from each mixin are also copied to the resulting class. Fields declared outside the constructor are handled by instantiating each base and merging its own instance properties into `this`.

## Performance

### Instantiating (e.g. `new User`)

The performance is proportional to instantiating each mixin class on its own + Mixin class itself.

If class `A`, `B`, `C` Takes 30ns to initiate (10ns for each),
Then `class extends mixin(A, B, C)` Takes 40ns to initiate (10ns for each mixin class + 10ns mixin itself).

### Accessing properties/methods (e.g. `user.login()`)

The performance is somewhat equal as if there is no `mixin`, deviation within the error limits.

## Development

### Running tests

```bash
bun test
```

### Benchmarking with `mitata`

The benchmark compares instantiation and method-call performance between a normal class that `extends` a single base and one produced by the `mixin` helper. The base classes include properties, symbols and decorators to approximate a real-world workload.

To run the benchmark:

```bash
bun i
bun bench
```
