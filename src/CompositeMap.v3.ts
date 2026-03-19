/**
 * FastIdentity & FastHasher
 * World-class performance for object interning using Symbol-based identity.
 * Combines Sum and Product for a robust commutative (order-insensitive) hash.
 */
const ID_SYMBOL = Symbol('__composite_id__');
const FALLBACK_MAP = new WeakMap<object, number>();
let globalNextId = 1;

class FastHasher {
  /**
   * Gets a unique stable ID for any object.
   * Priority: Symbol (Fastest) > WeakMap (Fallback for Frozen)
   */
  static getInternalId(obj: object): number {
    const existing = (obj as any)[ID_SYMBOL];
    if (existing !== undefined) return existing;

    if (!Object.isExtensible(obj)) {
      let id = FALLBACK_MAP.get(obj);
      if (id === undefined) {
        id = globalNextId++;
        FALLBACK_MAP.set(obj, id);
      }
      return id;
    }

    const id = globalNextId++;
    Object.defineProperty(obj, ID_SYMBOL, {
      value: id,
      enumerable: false,
      configurable: false,
      writable: false
    });
    return id;
  }

  /**
   * Mixes an integer to improve distribution.
   */
  static mix(id: number): number {
    id = ((id >>> 16) ^ id) * 0x45d9f3b;
    id = ((id >>> 16) ^ id) * 0x45d9f3b;
    id = (id >>> 16) ^ id;
    return id | 0;
  }

  /**
   * Generates a commutative hash (order-insensitive).
   * Combining Sum and Product (imul) significantly reduces collision probability.
   */
  static getCombinedId(keys: readonly object[]): number {
    let sum = 0;
    let product = 1;
    for (let i = 0; i < keys.length; i++) {
      const id = this.mix(this.getInternalId(keys[i]));
      sum = (sum + id) | 0;
      product = Math.imul(product, id);
    }
    return (sum ^ product) | 0;
  }

  /**
   * Retrieve existing IDs for keys without creating new ones.
   * Returns null if any object in the set hasn't been assigned an ID yet.
   */
  static tryGetCombinedId(keys: readonly object[]): number | null {
    let sum = 0;
    let product = 1;
    for (let i = 0; i < keys.length; i++) {
      const id = (keys[i] as any)[ID_SYMBOL] ?? FALLBACK_MAP.get(keys[i]);
      if (id === undefined) return null;

      const mixed = this.mix(id);
      sum = (sum + mixed) | 0;
      product = Math.imul(product, mixed);
    }
    return (sum ^ product) | 0;
  }
}

/**
 * CompositeMap
 * An order-insensitive map associating a collection of objects to a value.
 * Optimized for V8 by avoiding sorting and minimizing allocations.
 */
export class CompositeMap<K extends object[], V> {
  private storage = new Map<number, Array<{ keys: K, value: V }>>();
  #size = 0;

  get size(): number {
    return this.#size;
  }

  /**
   * Checks if two arrays of objects contain the same elements, regardless of order.
   * Optimized for small sets (2-3) and falls back to frequency map for larger sets.
   */
  private areKeySetsEqual(a: K, b: K): boolean {
    const len = a.length;
    if (len !== b.length) return false;
    if (len === 0) return true;

    // Fast-path for 1 element
    if (len === 1) return a[0] === b[0];

    // Fast-path for 2 elements: Symmetric check
    if (len === 2) {
      const a0 = a[0], a1 = a[1], b0 = b[0], b1 = b[1];
      return (a0 === b0 && a1 === b1) || (a0 === b1 && a1 === b0);
    }

    // Fast-path for 3 elements: Order-independent check using XOR and Sum of IDs
    if (len === 3) {
      const idA0 = (a[0] as any)[ID_SYMBOL] ?? FALLBACK_MAP.get(a[0]);
      const idA1 = (a[1] as any)[ID_SYMBOL] ?? FALLBACK_MAP.get(a[1]);
      const idA2 = (a[2] as any)[ID_SYMBOL] ?? FALLBACK_MAP.get(a[2]);

      const idB0 = (b[0] as any)[ID_SYMBOL] ?? FALLBACK_MAP.get(b[0]);
      const idB1 = (b[1] as any)[ID_SYMBOL] ?? FALLBACK_MAP.get(b[1]);
      const idB2 = (b[2] as any)[ID_SYMBOL] ?? FALLBACK_MAP.get(b[2]);

      return (idA0 ^ idA1 ^ idA2) === (idB0 ^ idB1 ^ idB2) &&
        (idA0 + idA1 + idA2) === (idB0 + idB1 + idB2);
    }

    // General case: Frequency map for O(n) order-insensitive comparison
    const counts = new Map<object, number>();
    for (let i = 0; i < len; i++) {
      const obj = a[i];
      counts.set(obj, (counts.get(obj) || 0) + 1);
    }

    for (let i = 0; i < len; i++) {
      const obj = b[i];
      const count = counts.get(obj);
      if (!count) return false;
      counts.set(obj, count - 1);
    }
    return true;
  }

  /**
   * Optimized set operation. 
   * Avoids .find() callback overhead and minimizes equality checks.
   */
  set(keys: K, value: V): this {
    const hash = FastHasher.getCombinedId(keys);
    const bucket = this.storage.get(hash);

    if (!bucket) {
      this.storage.set(hash, [{ keys, value }]);
      this.#size++;
      return this;
    }

    // Inlined loop for speed
    const blen = bucket.length;
    for (let i = 0; i < blen; i++) {
      const entry = bucket[i];
      if (this.areKeySetsEqual(entry.keys, keys)) {
        entry.value = value;
        return this;
      }
    }

    bucket.push({ keys, value });
    this.#size++;
    return this;
  }

  get(keys: K): V | undefined {
    const hash = FastHasher.tryGetCombinedId(keys);
    if (hash === null) return undefined;

    const bucket = this.storage.get(hash);
    if (!bucket) return undefined;

    const blen = bucket.length;
    // Fast-path: bucket has only one entry (common case with good hashing)
    if (blen === 1) {
      const entry = bucket[0];
      return this.areKeySetsEqual(entry.keys, keys) ? entry.value : undefined;
    }

    for (let i = 0; i < blen; i++) {
      const entry = bucket[i];
      if (this.areKeySetsEqual(entry.keys, keys)) {
        return entry.value;
      }
    }
    return undefined;
  }

  has(keys: K): boolean {
    const hash = FastHasher.tryGetCombinedId(keys);
    if (hash === null) return false;

    const bucket = this.storage.get(hash);
    if (!bucket) return false;

    const blen = bucket.length;
    for (let i = 0; i < blen; i++) {
      if (this.areKeySetsEqual(bucket[i].keys, keys)) {
        return true;
      }
    }
    return false;
  }

  delete(keys: K): boolean {
    const hash = FastHasher.tryGetCombinedId(keys);
    if (hash === null) return false;

    const bucket = this.storage.get(hash);
    if (!bucket) return false;

    const blen = bucket.length;
    for (let i = 0; i < blen; i++) {
      if (this.areKeySetsEqual(bucket[i].keys, keys)) {
        if (blen === 1) {
          this.storage.delete(hash);
        } else {
          bucket.splice(i, 1);
        }
        this.#size--;
        return true;
      }
    }
    return false;
  }

  clear(): void {
    this.storage.clear();
    this.#size = 0;
  }
}