export class CompositeMap<K extends object[], V> {
  private static readonly MAX_SAFE_INT_BIT = 31

  private readonly objectValues = new Map<number | bigint, V>()
  private readonly objectIds = new Map<object, number>()

  private idCounter = 1
  private incrementIdCounter = () => this.idCounter++

  private hash(keys: K): number | bigint {
    let hash = 0
    let hashBig: bigint | undefined

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      const id = this.objectIds.getOrInsertComputed(key, this.incrementIdCounter)

      // If at least one id is out of safe zone, escalate hash to BigInt.
      if (id >= CompositeMap.MAX_SAFE_INT_BIT) hashBig ??= BigInt(hash)
      if (hashBig != null) {
        hashBig |= 1n << BigInt(id)
      } else {
        hash |= 1 << id
      }

    }

    return hashBig ?? hash
  }

  set(keys: K, value: V): this {
    this.objectValues.set(this.hash(keys), value)
    return this
  }

  get(keys: K): V | undefined {
    return this.objectValues.get(this.hash(keys))
  }
}
