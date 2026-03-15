import mixin from "../mixin"

export abstract class Person {
  name = "person"
  greet() { return "hello from " + this.name }
}

export abstract class Profile {
  age = 25
  abstract name: string
}

export abstract class Human {
  height = 137
  weight = 1337 // kg
}

export class UserLocalMixed extends mixin(Person, Profile, Human) {
  static readonly instance = new UserLocalMixed
}
