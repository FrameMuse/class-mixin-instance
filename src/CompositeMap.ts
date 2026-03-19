export class CompositeMap<K extends object[], V> {
  private static ID = 0
  private static IDIncrement = () => this.ID++

  private static readonly ids = new WeakMap<object, number>()
  private static readonly values = new Map<number | bigint, any>()

  private static getId(key: any): number {
    return CompositeMap.ids.getOrInsertComputed(key, CompositeMap.IDIncrement)
  }

  private hash(keys: K): number {
    let hash = 0;
    for (let i = 0; i < keys.length; i++) {
      let id = CompositeMap.getId(keys[i]);

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

  set(keys: K, value: V): this {
    CompositeMap.values.set(this.hash(keys), value)
    return this
  }

  get(keys: K): V | undefined {
    return CompositeMap.values.get(this.hash(keys))
  }
}
