import { bench } from "./bench.suite"
import mixin from "./mixin"


const SYM = Symbol("decor")
function decorator(target: any, key: string) {
  (target[SYM] ||= []).push(key)
}

class A {
  @decorator test1 = 1
  method1() { return this.test1 }
  // [SYM]?: string[]
}

class B {
  @decorator test2 = 2
  method2() { return this.test2 }
  // [SYM]?: string[]
}

class C {
  @decorator test3 = 3
  method3() { return this.test3 }
  // [SYM]?: string[]
}


class Base {
  @decorator test1 = 1
  method1() { return this.test1 }

  @decorator test2 = 2
  method2() { return this.test2 }

  @decorator test3 = 3
  method3() { return this.test3 }

  [SYM]?: string[]
}
class Derived extends Base {
  test = "data"
  method() { return this.test }
}

@mixin.member
class OptimizedA { }
@mixin.member
class OptimizedB { }
class MixedOptimized extends mixin(OptimizedA, OptimizedB) { }



console.time("First time mixin")
mixin(A, B, C)
console.timeEnd("First time mixin")

console.time("Second time mixin")
mixin(A, B, C)
console.timeEnd("Second time mixin")


bench("Create mixin", () => mixin(A, B, C))
bench("Create class Light", () => class Light { })

class Light { }

class Mixed extends mixin(A, B, C) { }
const MixedEmpty = mixin()
const MixedLight = mixin(Light)

class DerivedMixed extends mixin(A, B, C) { }

class ChainA { }
class ChainB extends ChainA { }
class ChainC extends ChainB { }

class NativeChaining extends ChainC {
  static readonly instance = new NativeChaining
}

const derived = new Derived
const derivedMixed = new DerivedMixed
const optimized = new MixedOptimized


await bench.untilCompiled()


{
  using _ = bench.group("Definition")

  bench(() => class Light { })
  bench(() => class Derived extends Base { })
  bench(() => class NativeChaining extends ChainC { })
  bench(() => mixin(A, B))
  bench(() => mixin(OptimizedA, OptimizedB))
}


{
  using _ = bench.group("Newing")

  bench(() => new NativeChaining)
  bench(() => new Derived)
  bench(() => new DerivedMixed)
  bench(() => new Mixed)
  bench(() => new MixedOptimized)
  bench(() => new mixin(A, B, C))
}





{
  using _ = bench.group("instanceof")

  class Plain { }
  class Overridden { static [Symbol.hasInstance](instance: any) { return true } }
  const object = {}

  bench(() => object instanceof Plain)
  bench(() => NativeChaining.instance instanceof ChainA)
  bench("instanceof (plain fallback)", () => Function.prototype[Symbol.hasInstance].call(object, Plain))
  bench(() => object instanceof Overridden)

  bench(() => derivedMixed instanceof Mixed)
  bench(() => derivedMixed instanceof C)
  bench(() => derivedMixed instanceof mixin(A, B, C))
  bench(() => optimized instanceof mixin(OptimizedA, OptimizedB))
}
