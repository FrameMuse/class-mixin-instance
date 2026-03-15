import { bench } from "../bench.suite"
import { mix } from "mixwith"
import { Person, Profile, Human, UserLocalMixed } from "./setup"


class Base { } // Dummy class for `mixwith` to work.

class UserMixwith extends mix(Base).with(Person, Profile, Human) {
  static readonly instance = new UserMixwith

  id = 1
}

console.log("this library vs `mixwith` - in order")

// Benchmarks
{
  using _ = bench.group("Newing")

  bench(() => new UserLocalMixed)
  bench(() => new UserMixwith)
}

{
  using _ = bench.group("Extending")

  bench(() => class extends UserLocalMixed { })
  bench(() => class extends UserMixwith { })
}

{
  using _ = bench.group("`instanceof`")

  bench(() => UserLocalMixed.instance instanceof Person)
  bench(() => UserMixwith.instance instanceof Person)
}

{
  using _ = bench.group("calling ")

  bench(() => UserLocalMixed.instance.greet())
  bench(() => UserMixwith.instance.greet())
}