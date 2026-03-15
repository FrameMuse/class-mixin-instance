import { bench } from "../bench.suite"
import { Mixin } from "ts-mixer"
import { Person, Profile, Human, UserLocalMixed } from "./setup"


class UserTsMixer extends Mixin(Person, Profile, Human) {
  static readonly instance = new UserTsMixer

  id = 1
}

console.log("this library vs `ts-mixer` - in order")

// Benchmarks
{
  using _ = bench.group("Newing")

  bench(() => new UserLocalMixed)
  bench(() => new UserTsMixer)
}

{
  using _ = bench.group("Extending")

  bench(() => class extends UserLocalMixed { })
  bench(() => class extends UserTsMixer { })
}

{
  using _ = bench.group("`instanceof`")

  bench(() => UserLocalMixed.instance instanceof Person)
  bench(() => UserTsMixer.instance instanceof Person)
}

{
  using _ = bench.group("calling ")

  bench(() => UserLocalMixed.instance.greet())
  bench(() => UserTsMixer.instance.greet())
}