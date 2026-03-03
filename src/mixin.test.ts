import { describe, it, expect } from "bun:test"
import { mixin, MIXIN_CLASS } from "./mixin"

class Person {
  name!: string
  age!: number
  private gender!: "aircraft"
}

class Profile {
  name!: string
  avatar!: string
  protected something!: {}

  protected _test = 111
  public get test() { return this._test }
}

class Unrelated { }

describe("mixin", () => {
  it("combines prototypes and allows instanceof checks", () => {
    class User extends mixin(Person, Profile) {
      id!: number
    }

    const user = new User()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    // console.log('Profile metadata:', (Profile as any)[MixinSymbol])
    expect(user).toBeInstanceOf(User)
    expect(user).toBeInstanceOf(Person)
    expect(user).toBeInstanceOf(Profile)

    // repeated invocation should return the same class (cached)
    const MAgain = mixin(Person, Profile)
    expect(MAgain).toBe(mixin(Person, Profile))
    expect(user).toBeInstanceOf(MAgain)
  })

  it("does not match when extra classes are mixed", () => {
    class User extends mixin(Person, Profile) { }

    expect(mixin(Person, Profile)).not.toBe(mixin(Person, Profile, Unrelated))
    expect(new User).not.toBeInstanceOf(mixin(Person, Profile, Unrelated))
  })

  it("does not introduce any issues accessing mixin properties/methods", () => {
    class User1 extends mixin(Person, Profile) { }
    const user1 = new User1
    expect(user1.test).toBe(111)

    class User2 extends mixin(Person, Profile) {
      protected override _test = 222
    }
    const user2 = new User2
    expect(user2.test).toBe(222)
  })

  it("decorator metadata is preserved when mixing classes", () => {
    const SYM = Symbol("decor")

    function decoA(target: any, key: string) {
      (target[SYM] ||= []).push("A-" + key)
    }
    function decoB(target: any, key: string) {
      (target[SYM] ||= []).push("B-" + key)
    }

    class A {
      @decoA
      shared!: string
      @decoA
      onlyA!: number
    }

    class B {
      @decoB
      shared!: string
      @decoB
      onlyB!: boolean
    }

    const Mixed = mixin(A, B)
    // decorator metadata from both classes should live on Mixed.prototype
    expect(Mixed.prototype[SYM]).toContain("A-shared")
    expect(Mixed.prototype[SYM]).toContain("B-shared")
    expect(Mixed.prototype[SYM]).toContain("A-onlyA")
    expect(Mixed.prototype[SYM]).toContain("B-onlyB")

    // different-property decorators should also be merged
    class C {
      @decoA
      foo!: string
    }
    class D {
      @decoB
      bar!: string
    }
    const Mixed2 = mixin(C, D)
    expect(Mixed2.prototype[SYM]).toContain("A-foo")
    expect(Mixed2.prototype[SYM]).toContain("B-bar")
  })

  it("stores metadata on base constructors", () => {
    const M1 = mixin(class { }, Person)
    const M2 = mixin(class { }, Profile)

    const meta1 = (Person as any)[MIXIN_CLASS]?.mixed as any[]
    const meta2 = (Profile as any)[MIXIN_CLASS]?.mixed as any[]

    expect(meta1).toContain(M1)
    expect(meta2).toContain(M2)
  })

  it("executes all constructors when instantiating", () => {
    let ranPerson = false
    let ranProfile = false

    class P extends Person {
      constructor() {
        super()
        ranPerson = true
      }
    }

    class Q extends Profile {
      constructor() {
        super()
        ranProfile = true
      }
    }

    const Mixed = mixin(P, Q)
    new Mixed()

    expect(ranPerson).toBe(true)
    expect(ranProfile).toBe(true)
  })

  it("does not collide for different sets when order is irrelevant", () => {
    const pool = Array.from({ length: 50 }, () => class { })
    const seen = new Map<string, any>()

    for (let i = 0; i < 1000; i++) {
      const idxs: number[] = []
      while (idxs.length < 3) {
        const r = Math.floor(Math.random() * pool.length)
        if (!idxs.includes(r)) idxs.push(r)
      }
      const sorted = [...idxs].sort((a, b) => a - b)
      const key = sorted.join(",")
      const perm = [...sorted].sort(() => Math.random() - 0.5)
      const m = mixin(pool[perm[0]], pool[perm[1]], pool[perm[2]])
      if (seen.has(key)) {
        expect(seen.get(key)).toBe(m)
      } else {
        seen.set(key, m)
      }
    }

    const unique = new Set(seen.values())
    expect(unique.size).toBe(seen.size)
  })
})
