# Class Mixin in TypeScript

```bash
bun i class-mixin-instance
```

## Example

```ts
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
- mixin classes types must match each other, otherwise error will be shown at `mixin(Person, Profile)`.
- a class that extends a mixin can be checked with `instanceof` for each class and altogether.

### Type per class

When inspecting a property from a mixin, your IDE will display what this type belongs to.
<img width="612" height="194" alt="image" src="https://github.com/user-attachments/assets/b2b3a4bc-58ff-44fb-a4c7-6cf4433686ab" />

### Type `super`

When inspecting `super`, your IDE will display the mixins.

<img width="618" height="182" alt="image" src="https://github.com/user-attachments/assets/334b31fc-00e5-4fdd-b255-4fcd0390abbc" />

## Decorator support

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
