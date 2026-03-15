import { bench } from "../bench.suite"
import { UserLocalMixed, Person as PersonLocal } from "./setup"


const Person = (base: any) => class extends base {
  name = 'person'
  greet() { return 'hello from ' + this.name }
}

const Profile = (base: any) => class extends base {
  age = 25
  getProfile() { return { age: this.age } }
}

const Human = (base: any) => class extends base {
  height = 137
  weight = 1337 // kg
}

class Base { }
class UserNative extends Human(Person(Profile(Base))) {
  static readonly instance = new UserNative

  id = 1
}

console.log("this library vs native implementation - in order")

// Benchmarks
{
  using _ = bench.group("Newing")

  bench(() => new UserLocalMixed)
  bench(() => new UserNative)
}

{
  using _ = bench.group("Extending")

  bench(() => class extends UserLocalMixed { })
  bench(() => class extends UserNative { })
}

{
  using _ = bench.group("`instanceof`")

  bench(() => UserLocalMixed.instance instanceof PersonLocal)
  bench(() => UserNative.instance instanceof PersonLocal)
}

{
  using _ = bench.group("calling methods")

  bench(() => UserLocalMixed.instance.greet())
  bench(() => UserNative.instance.greet())
}