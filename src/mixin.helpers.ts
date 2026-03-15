export const MIXIN_METADATA: unique symbol = Symbol("mixin.metadata")
export const MIXIN_CLASS: unique symbol = Symbol("mixin.class")




/** @internal */
export function copyReflectMetadata(target: any, source: any): void {
  if (typeof Reflect !== "object" || typeof Reflect.getMetadataKeys !== "function") {
    return
  }
  for (const key of Reflect.getMetadataKeys(source)) {
    try {
      const value = Reflect.getMetadata(key, source)
      Reflect.defineMetadata(key, value, target)
    } catch {
      // ignore any failures - some metadata keys may be read-only
    }
  }
}

/** @internal */
export function copyStaticMembers(Mixin: any, constructor: any): void {
  for (const key of Reflect.ownKeys(constructor)) {
    if (key === "name") continue
    if (key === "length") continue
    if (key === "prototype") continue

    if (key === MIXIN_METADATA) continue
    if (key === Symbol.hasInstance) continue

    const descriptor = Object.getOwnPropertyDescriptor(constructor, key)!
    defineProperty(Mixin, key, descriptor)
  }
}

/** @internal */
export function copyPrototypeMembers(Target: any, constructor: Function): void {
  const prototype = constructor.prototype
  if (prototype === Object.prototype) return

  for (const key of Reflect.ownKeys(prototype)) {
    if (key === "constructor") continue

    const descriptor = Reflect.getOwnPropertyDescriptor(prototype, key)!
    const existingDescriptor = Reflect.getOwnPropertyDescriptor(Target.prototype, key)

    if (existingDescriptor && typeof existingDescriptor.value === 'function' && typeof descriptor.value === 'function') {
      // Chain the functions: call existing first, then new
      const chainedFunction = function(this: any, ...args: any[]) {
        existingDescriptor.value.apply(this, args)
        return descriptor.value.apply(this, args)
      }
      // Preserve other descriptor properties
      const newDescriptor = {
        ...descriptor,
        value: chainedFunction
      }
      Object.defineProperty(Target.prototype, key, newDescriptor)
    } else {
      Object.defineProperty(Target.prototype, key, descriptor)
    }
  }
}

/** @internal */
export function overrideInstanceOf(constructor: any, hasInstance: (instance: object, constructor: Function) => boolean): void {
  if (MIXIN_CLASS in constructor) return

  const fallback = constructor[Symbol.hasInstance]
  defineProperty(constructor, Symbol.hasInstance, {
    value(this: any, instance: any) {
      if (!(instance && typeof instance === "object")) {
        return fallback.call(this, instance)
      }

      return hasInstance(instance, this)
    }
  })
}


function defineProperty(o: any, p: PropertyKey, attributes: PropertyDescriptor & ThisType<any>) {
  try {
    Object.defineProperty(o, p, attributes)
  } catch {
    // ignore
  }
}