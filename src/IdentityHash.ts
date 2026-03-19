/**
 * High-Performance Identity hashing.
*/
export class IdentityHash {
  private static readonly SYMBOL = Symbol();
  private nextId = 0;

  /**
   * Directly attaches a hidden ID to the object.
   * This is significantly faster than WeakMap.get/set.
   */
  private getId(obj: any): number {
    return obj[IdentityHash.SYMBOL] ?? (obj[IdentityHash.SYMBOL] = this.nextId++);
  }

  /**
   * Commutative hashing using a faster xor-shift-style mix.
   * We use variadic arguments to avoid array allocation if possible.
   */
  hash(values: object[]): number {
    let hash = 0;
    for (let i = 0; i < values.length; i++) {
      let id = this.getId(values[i]);

      // Fast mixing (MurmurHash3-style 32-bit mixer)
      id ^= id >>> 16;
      id = Math.imul(id, 0x85ebca6b);
      id ^= id >>> 13;
      id = Math.imul(id, 0xc2b2ae35);
      id ^= id >>> 16;

      // Commutative addition (order-independent)
      hash = (hash + id) | 0;
    }
    return hash;
  }
}