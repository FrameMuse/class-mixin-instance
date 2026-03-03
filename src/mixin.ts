import { CompositeMap } from "./CompositeMap"

type UnionToIntersection<U> =
  (U extends any ? (k: U) => void : never) extends ((k: infer I) => void)
  ? I
  : never




type ABC = abstract new (...args: never[]) => unknown

type Mixin<T extends ABC> = MixinConstructor<T>
type MixinConstructor<T extends ABC> = new () => UnionToIntersection<InstanceType<T>>

export const MIXIN_METADATA = Symbol("mixin.metadata")
export const MIXIN_CLASS = Symbol("mixin.class")
const mixinCache = new CompositeMap<object[], object>()

class MixinEmpty { }
export function mixin<T extends (abstract new () => void)[]>(...constructors: T): Mixin<T[number]> {
  if (constructors.length === 0) return MixinEmpty as never

  const mixin = mixinCache.get(constructors)
  if (mixin != null) return mixin as never

  const properties = new Map<object, symbol[]>()

  for (const C of constructors as any[]) {
    properties.set(C, Object.getOwnPropertySymbols(new C))
  }

  // extend the first constructor for native instantiation speed
  const [First, ...Rest] = constructors as any[]
  class Mixin extends First {
    constructor() {
      super()
      // copy over instance properties from the remaining constructors
      for (const C of Rest) {
        const instance = new C

        // plain assignment for enumerable fields
        for (const key in instance) (this as any)[key] = instance[key]

        // copy symbols separately
        const symbols = properties.get(C)!
        for (const symbol of symbols) {
          (this as any)[symbol] = instance[symbol]
        }
      }
    }

    // record the list of constructors on the mixed class itself
    static [MIXIN_METADATA] = { bases: constructors.slice() }
  }

  mixinCache.set(constructors, Mixin)


  // copy prototype members (including symbols) from every input class
  for (const C of constructors) {
    const proto = C.prototype
    if (proto === Object.prototype) continue

    for (const key of Object.getOwnPropertyNames(proto)) {
      if (key === "constructor") continue
      const descriptor = Object.getOwnPropertyDescriptor(proto, key)!
      // if target already has an array value and the new one is also an
      // array, merge them to avoid overwriting decorator metadata
      if (
        descriptor &&
        "value" in descriptor &&
        Array.isArray(descriptor.value) &&
        Array.isArray((Mixin.prototype as any)[key])
      ) {
        // create combined array without duplicates
        const existing = (Mixin.prototype as any)[key] as any[]
        (Mixin.prototype as any)[key] = Array.from(new Set([...existing, ...descriptor.value]))
      } else {
        Object.defineProperty(Mixin.prototype, key, descriptor)
      }
    }
    for (const symbol of Object.getOwnPropertySymbols(proto)) {
      const descriptor = Object.getOwnPropertyDescriptor(proto, symbol)!
      if (
        descriptor &&
        "value" in descriptor &&
        Array.isArray(descriptor.value) &&
        Array.isArray((Mixin.prototype as any)[symbol])
      ) {
        const existing = (Mixin.prototype as any)[symbol] as any[]
        (Mixin.prototype as any)[symbol] = Array.from(new Set([...existing, ...descriptor.value]))
      } else {
        Object.defineProperty(Mixin.prototype, symbol, descriptor)
      }
    }
  }


  copyStaticPropertiesSymbols(Mixin, constructors)


  for (const C of constructors as any[]) {
    let meta: any = C[MIXIN_CLASS]
    if (!meta) {
      meta = { mixed: [] }
      Object.defineProperty(C, MIXIN_CLASS, { value: meta, configurable: true })
    }

    if (meta.mixed.includes(Mixin)) return Mixin as never
    meta.mixed.push(Mixin)

    const fallback = C[Symbol.hasInstance] ?? Function.prototype[Symbol.hasInstance]
    defineProperty(C, Symbol.hasInstance, {
      value(this: any, instance: any) {
        if (!(instance && typeof instance === "object")) {
          return fallback.call(this, instance)
        }

        return hasInstance(this, instance, C)
      }
    })
  }


  return Mixin as never
}

export namespace mixin {
  export function member<T extends Function>(target: T) {

  }
}


function defineProperty(o: any, p: PropertyKey, attributes: PropertyDescriptor & ThisType<any>) {
  try {
    Object.defineProperty(o, p, attributes)
  } catch {
    // ignore
  }
}


function hasInstance(me: any, instance: any, constructor: any) {
  const myMeta: any = me[MIXIN_METADATA]
  const isTestingMixed = myMeta && myMeta.bases

  if (isTestingMixed) {
    const myBases: any[] = myMeta.bases
    for (const M of constructor[MIXIN_CLASS].mixed as any[]) {
      if (M.prototype.isPrototypeOf(instance)) {
        const theirMeta: any = (M as any)[MIXIN_METADATA]
        const theirBases: any[] = theirMeta?.bases || []
        if (
          theirBases.length === myBases.length &&
          theirBases.every((x, i) => x === myBases[i])
        ) {
          return true
        }
      }
    }
  } else {
    for (const M of constructor[MIXIN_CLASS].mixed) {
      if (M.prototype.isPrototypeOf(instance)) return true
    }
  }

  return false
}


function copyStaticPropertiesSymbols(Mixin: any, constructors: any[]) {
  for (const C of constructors) {
    for (const key of Object.getOwnPropertyNames(C)) {
      if (key === "name") continue
      if (key === "length") continue
      if (key === "prototype") continue

      const descriptor = Object.getOwnPropertyDescriptor(C, key)!
      defineProperty(Mixin, key, descriptor)
    }
    for (const symbol of Object.getOwnPropertySymbols(C)) {
      if (symbol === MIXIN_CLASS) continue
      if (symbol === MIXIN_METADATA) continue
      if (symbol === Symbol.hasInstance) continue

      const descriptor = Object.getOwnPropertyDescriptor(C, symbol)!
      defineProperty(Mixin, symbol, descriptor)
    }
  }
}