/**
 * CompositeMap
 * An order-insensitive map that associates a collection of Objects to a Value.
 * * Improvements:
 * 1. Collision Handling: Uses "Chaining" (buckets) to handle rare hash collisions.
 * 2. Robust Hashing: Combines Sum and Product (via Math.imul) for better distribution.
 * 3. O(n) Equality: Uses ID frequency counting for order-insensitive key comparison.
 * 4. Engine Optimization: Leverages a single Map for better V8/SpiderMonkey optimization.
 */

type Entry<K, V> = { keys: K; value: V };

export class CompositeMap<K extends object[], V> {
  // Global mapping of objects to unique incrementing IDs
  private static identityMap = new Map<object, number>();
  private nextId = 0;

  // Internal storage: Map<Hash, Bucket[]>
  private storage = new Map<number, Entry<K, V>[]>();

  /**
   * Mixes an integer to improve distribution.
   */
  private mix(id: number): number {
    id = ((id >>> 16) ^ id) * 0x45d9f3b;
    id = ((id >>> 16) ^ id) * 0x45d9f3b;
    id = (id >>> 16) ^ id;
    return id | 0;
  }

  /**
   * Internal helper to get or create a unique ID for a single object.
   */
  private getSingleObjectId(obj: object): number {
    let id = CompositeMap.identityMap.get(obj);
    if (id === undefined) {
      id = ++this.nextId;
      CompositeMap.identityMap.set(obj, id);
    }
    return id;
  }

  /**
   * Generates a commutative hash (order-insensitive).
   * Combining Sum and Product (imul) significantly reduces collision probability.
   */
  private getCombinedId(keys: K): number {
    let sum = 0;
    let product = 1;
    for (let i = 0; i < keys.length; i++) {
      const id = this.mix(this.getSingleObjectId(keys[i]));
      sum = (sum + id) | 0;
      product = Math.imul(product, id);
    }
    return (sum ^ product) | 0;
  }

  /**
   * Retrieve existing IDs for keys without creating new ones.
   */
  private tryGetCombinedId(keys: K): number | null {
    let sum = 0;
    let product = 1;
    for (let i = 0; i < keys.length; i++) {
      const id = CompositeMap.identityMap.get(keys[i]);
      if (id == null) return null;

      const mixed = this.mix(id);
      sum = (sum + mixed) | 0;
      product = Math.imul(product, mixed);
    }
    return (sum ^ product) | 0;
  }

  /**
   * Checks if two arrays of objects contain the same elements, regardless of order.
   * Uses a frequency map for O(n) complexity.
   */
  private areKeySetsEqual(a: K, b: K): boolean {
    if (a === b) return true;
    if (a.length !== b.length) return false;

    const counts: Record<number, number> = {}
    for (let i = 0; i < a.length; i++) {
      const id = CompositeMap.identityMap.get(a[i])!;

      counts[id] ??= 0
      counts[id]++
    }

    for (let i = 0; i < b.length; i++) {
      const id = CompositeMap.identityMap.get(b[i])
      if (id == null) return false

      const count = counts[id];
      if (!count) return false;

      counts[id]--;
    }
    return true;
  }

  /**
   * Maps an array of objects to a value.
   */
  set(keys: K, value: V): void {
    const groupId = this.getCombinedId(keys);
    let bucket = this.storage.get(groupId);

    if (!bucket) {
      this.storage.set(groupId, [{ keys, value }]);
      return;
    }

    // Handle potential collisions within the same hash bucket
    const entry = bucket.find(e => this.areKeySetsEqual(e.keys, keys));
    if (entry) {
      entry.value = value;
    } else {
      bucket.push({ keys, value });
    }
  }

  /**
   * Retrieves a value based on the array of objects.
   */
  get(keys: K): V | undefined {
    const groupId = this.tryGetCombinedId(keys);
    if (groupId === null) return undefined;

    const bucket = this.storage.get(groupId);
    return bucket?.find(e => this.areKeySetsEqual(e.keys, keys))?.value;
  }
}