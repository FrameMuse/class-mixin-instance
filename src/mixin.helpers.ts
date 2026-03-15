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
export function copyPrototypeMembers(Target: any, constructor: Function, descriptors: Map<PropertyKey, PropertyDescriptor[]>): void {
  const prototype = constructor.prototype
  if (prototype === Object.prototype) return

  for (const key of Reflect.ownKeys(prototype)) {
    if (key === "constructor") continue

    const descriptor = Reflect.getOwnPropertyDescriptor(prototype, key)!
    if (!descriptors.has(key)) {
      descriptors.set(key, [])
    }
    descriptors.get(key)!.push(descriptor)
  }
}

/** @internal */
export function resolvePrototypeMembers(Target: any, descriptors: Map<PropertyKey, PropertyDescriptor[]>): void {
  for (const [key, propertyDescriptors] of descriptors) {
    const existing = Reflect.getOwnPropertyDescriptor(Target.prototype, key)
    const allDescriptors = existing ? [existing, ...propertyDescriptors] : propertyDescriptors

    if (propertyDescriptors.length === 1) {
      Object.defineProperty(Target.prototype, key, propertyDescriptors[0])
      continue
    }

    const root = allDescriptors[0]

    // Chain functions
    if (typeof root.value === "function") {
      const chained = function (this: any, ...args: any[]) {
        let result
        for (const descriptor of allDescriptors) {
          result = descriptor.value.apply(this, args)
        }
        return result
      }
      const newDesc = { ...root, value: chained }

      Object.defineProperty(Target.prototype, key, newDesc)
      continue
    }

    // Merge arrays
    if (Array.isArray(root.value)) {
      const merged = allDescriptors.flatMap(d => d.value)
      const newDesc = { ...root, value: merged }

      Object.defineProperty(Target.prototype, key, newDesc)
      continue
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