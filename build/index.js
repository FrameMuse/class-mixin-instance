class CompositeMap {
  static MAX_SAFE_INT_BIT = 31;
  objectValues = /* @__PURE__ */ new Map();
  objectIds = /* @__PURE__ */ new Map();
  idCounter = 1;
  incrementIdCounter = () => this.idCounter++;
  hash(keys) {
    let hash = 0;
    let hashBig;
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const id = this.objectIds.getOrInsertComputed(key, this.incrementIdCounter);
      if (id >= CompositeMap.MAX_SAFE_INT_BIT) hashBig ??= BigInt(hash);
      if (hashBig != null) {
        hashBig |= 1n << BigInt(id);
      } else {
        hash |= 1 << id;
      }
    }
    return hashBig ?? hash;
  }
  set(keys, value) {
    this.objectValues.set(this.hash(keys), value);
    return this;
  }
  get(keys) {
    return this.objectValues.get(this.hash(keys));
  }
}

const MIXIN_METADATA = /* @__PURE__ */ Symbol("mixin.metadata");
const MIXIN_CLASS = /* @__PURE__ */ Symbol("mixin.class");
const mixinCache = new CompositeMap();
class MixinEmpty {
}
function mixin(...constructors) {
  if (constructors.length === 0) return MixinEmpty;
  const mixin2 = mixinCache.get(constructors);
  if (mixin2 != null) return mixin2;
  const properties = /* @__PURE__ */ new Map();
  for (const C of constructors) {
    properties.set(C, Object.getOwnPropertySymbols(new C()));
  }
  const [First, ...Rest] = constructors;
  const Mixin = class Mixin extends First {
    constructor() {
      super();
      for (const C of Rest) {
        const instance = new C();
        for (const key in instance) this[key] = instance[key];
        const symbols = properties.get(C);
        for (const symbol of symbols) {
          this[symbol] = instance[symbol];
        }
      }
    }
    // record the list of constructors on the mixed class itself
    static [MIXIN_METADATA] = { bases: constructors.slice() };
  };
  mixinCache.set(constructors, Mixin);
  for (const C of constructors) {
    const proto = C.prototype;
    if (proto === Object.prototype) continue;
    for (const key of Object.getOwnPropertyNames(proto)) {
      if (key === "constructor") continue;
      const descriptor = Object.getOwnPropertyDescriptor(proto, key);
      if (descriptor && "value" in descriptor && Array.isArray(descriptor.value) && Array.isArray(Mixin.prototype[key])) {
        const existing = Mixin.prototype[key];
        Mixin.prototype[key] = Array.from(/* @__PURE__ */ new Set([...existing, ...descriptor.value]));
      } else {
        Object.defineProperty(Mixin.prototype, key, descriptor);
      }
    }
    for (const symbol of Object.getOwnPropertySymbols(proto)) {
      const descriptor = Object.getOwnPropertyDescriptor(proto, symbol);
      if (descriptor && "value" in descriptor && Array.isArray(descriptor.value) && Array.isArray(Mixin.prototype[symbol])) {
        const existing = Mixin.prototype[symbol];
        Mixin.prototype[symbol] = Array.from(/* @__PURE__ */ new Set([...existing, ...descriptor.value]));
      } else {
        Object.defineProperty(Mixin.prototype, symbol, descriptor);
      }
    }
  }
  copyStaticPropertiesSymbols(Mixin, constructors);
  for (const C of constructors) {
    let meta = C[MIXIN_CLASS];
    if (!meta) {
      meta = { mixed: [] };
      Object.defineProperty(C, MIXIN_CLASS, { value: meta, configurable: true });
    }
    if (meta.mixed.includes(Mixin)) return Mixin;
    meta.mixed.push(Mixin);
    const fallback = C[Symbol.hasInstance] ?? Function.prototype[Symbol.hasInstance];
    defineProperty(C, Symbol.hasInstance, {
      value(instance) {
        if (!(instance && typeof instance === "object")) {
          return fallback.call(this, instance);
        }
        return hasInstance(this, instance, C);
      }
    });
  }
  return Mixin;
}
((mixin2) => {
  function member(target) {
    return class extends target {
      static [MIXIN_CLASS] = { mixed: [] };
      static [Symbol.hasInstance](instance) {
        if (!(instance && typeof instance === "object")) {
          return super[Symbol.hasInstance].call(this, instance);
        }
        return hasInstance(this, instance, target);
      }
    };
  }
  mixin2.member = member;
})(mixin || (mixin = {}));
function defineProperty(o, p, attributes) {
  try {
    Object.defineProperty(o, p, attributes);
  } catch {
  }
}
function hasInstance(me, instance, constructor) {
  const myMeta = me[MIXIN_METADATA];
  const isTestingMixed = myMeta && myMeta.bases;
  if (isTestingMixed) {
    const myBases = myMeta.bases;
    for (const M of constructor[MIXIN_CLASS].mixed) {
      if (M.prototype.isPrototypeOf(instance)) {
        const theirMeta = M[MIXIN_METADATA];
        const theirBases = theirMeta?.bases || [];
        if (theirBases.length === myBases.length && theirBases.every((x, i) => x === myBases[i])) {
          return true;
        }
      }
    }
  } else {
    for (const M of constructor[MIXIN_CLASS].mixed) {
      if (M.prototype.isPrototypeOf(instance)) return true;
    }
  }
  return false;
}
function copyStaticPropertiesSymbols(Mixin, constructors) {
  for (const C of constructors) {
    for (const key of Object.getOwnPropertyNames(C)) {
      if (key === "name") continue;
      if (key === "length") continue;
      if (key === "prototype") continue;
      const descriptor = Object.getOwnPropertyDescriptor(C, key);
      defineProperty(Mixin, key, descriptor);
    }
    for (const symbol of Object.getOwnPropertySymbols(C)) {
      if (symbol === MIXIN_CLASS) continue;
      if (symbol === MIXIN_METADATA) continue;
      if (symbol === Symbol.hasInstance) continue;
      const descriptor = Object.getOwnPropertyDescriptor(C, symbol);
      defineProperty(Mixin, symbol, descriptor);
    }
  }
}

export { mixin };
//# sourceMappingURL=index.js.map
