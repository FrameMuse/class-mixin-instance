import { mixin } from "./mixin"

@mixin.member
class Person {
  name!: string
  age!: number

  private gender!: "aircraft"
}

@mixin.member
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

// repeated mixin invocation should still recognize the same instance
const MAgain = mixin(Person, Profile);
user instanceof MAgain // === true (metadata-based instanceof)
