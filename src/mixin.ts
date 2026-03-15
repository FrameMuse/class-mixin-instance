import { CompositeMap } from "./CompositeMap"
import { copyPrototypeMembers, copyReflectMetadata, copyStaticMembers, MIXIN_CLASS, MIXIN_METADATA, overrideInstanceOf, resolvePrototypeMembers } from "./mixin.helpers"
import { AbstractClass, MixinCallable, MixinConstructor, MixinMetadata, MixinNewable, UnionToIntersection } from "./mixin.types"



const mixinCache = new CompositeMap<object[], object>()
class MixinEmpty { }




function createMixed<T extends AbstractClass[]>(constructors: T): MixinConstructor<T[number]> {
  if (constructors.length === 0) return MixinEmpty as never

  const mixin = mixinCache.get(constructors)
  if (mixin != null) return mixin as never


  const properties = new Map<object, (keyof never)[]>()


  // extend the first constructor for native instantiation speed
  const [First, ...Rest] = constructors as any[]
  const Mixin = class Mixin extends First {
    constructor(...args: any[]) {
      super(...args)
      // copy over instance properties from the remaining constructors
      for (const C of Rest) {
        const instance = new C

        const keys = properties.get(C)!
        for (const key of keys) {
          if (key === "constructor") continue
          (this as any)[key] = instance[key]
        }
      }
    }

    static [MIXIN_METADATA]: MixinMetadata[typeof MIXIN_METADATA]
    static {
      const extendsItems = []

      for (const constructor of constructors as any[]) {
        const superExtends = constructor[MIXIN_METADATA]?.extendsArray ?? []

        extendsItems.push(constructor)
        extendsItems.push(...superExtends)
      }

      this[MIXIN_METADATA] = {
        extendsArray: extendsItems,
        extendsSet: new Set(extendsItems)
      }
    }
  }



  mixinCache.set(constructors, Mixin)


  // accumulate prototype members from every input class
  const prototypeDescriptors = new Map<PropertyKey, PropertyDescriptor[]>()
  for (const constructor of constructors as any[]) {
    const instance = new constructor
    const instanceKeys = Reflect.ownKeys(instance)

    properties.set(constructor, instanceKeys)

    // console.log("constructor", constructor)
    copyPrototypeMembers(Mixin, constructor, prototypeDescriptors)
    copyStaticMembers(Mixin, constructor)
    copyReflectMetadata(Mixin, constructor) // Copy decorators.
    overrideInstanceOf(constructor, hasInstance)
  }

  // resolve accumulated prototype members
  resolvePrototypeMembers(Mixin, prototypeDescriptors)

  return Mixin as never
}


function mixin<T extends AbstractClass[]>(this: any, ...constructors: T): MixinConstructor<T[number]> {
  if (this instanceof mixin) return new (createMixed(constructors)) as never

  return createMixed(constructors)
}
namespace mixin {
  export function member<T extends new (...args: []) => any>(target: T & {}): T {
    if (MIXIN_CLASS in target) return target

    return class Mixed extends target {
      static [MIXIN_CLASS] = {}
      static [Symbol.hasInstance](instance: any) {
        if (!(instance && typeof instance === "object")) {
          return super[Symbol.hasInstance].call(this, instance)
        }

        return hasInstance(instance, this)
      }
    }
  }

  export function as<Base extends new (...args: any[]) => void>(base: Base) {
    return {
      with: <T extends AbstractClass[]>(...constructors: T) => createMixed([base, ...constructors]) as new (...args: ConstructorParameters<Base>) => InstanceType<Base> & UnionToIntersection<InstanceType<T[number]>>
    }
  }
}

export default mixin as typeof mixin & MixinCallable & MixinNewable



export function hasInstance(instance: any, constructor: any): boolean {
  if (instance == null) return false

  const instancePrototype = Object.getPrototypeOf(instance)
  const instanceConstructor = instancePrototype.constructor
  const instanceMeta = instanceConstructor[MIXIN_METADATA] as MixinMetadata[typeof MIXIN_METADATA]

  if (constructor === instanceConstructor) return true
  if (instanceMeta == null) return false

  const constructorMeta = constructor[MIXIN_METADATA] as MixinMetadata[typeof MIXIN_METADATA]
  if (constructorMeta != null) {
    if (constructorMeta.extendsArray.length === 0) return false
    return constructorMeta.extendsArray.every(extendedEachOther, instanceMeta)
  }

  return instanceMeta.extendsSet.has(constructor)
}

function extendedEachOther(this: MixinMetadata[typeof MIXIN_METADATA], extend: Function) {
  return this.extendsSet.has(extend)
}