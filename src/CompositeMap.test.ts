import { describe, it, expect } from "bun:test"
import { CompositeMap } from "./CompositeMap"

describe("CompositeMap", () => {
  it("does not care about order of keys", () => {
    const map = new CompositeMap<[object, object], string>()
    const A = { name: "A" }
    const B = { name: "B" }

    map.set([A, B], "Order AB")

    expect(map.get([A, B])).toBe("Order AB")
    expect(map.get([B, A])).toBe("Order AB")
  })

  it("should handle more than 31 unique objects (BigInt escalation)", () => {
    const map = new CompositeMap<object[], string>()
    const objects = Array.from({ length: 50 }, (_, i) => ({ id: i }))

    // Register all objects to force the counter past MAX_SAFE_INT_BIT
    objects.forEach((obj, i) => map.set([obj], `val_${i}`))

    // Test a composite key using objects from the "BigInt zone"
    const key: [object, object] = [objects[40], objects[45]]
    map.set(key, "Large ID Success")

    expect(map.get(key)).toBe("Large ID Success")
    expect(map.get([objects[45], objects[40]])).toBe("Large ID Success")
    expect(map.get([objects[46], objects[40]])).toBeUndefined()
  })

  it("should maintain referential integrity (structural equality !== identity)", () => {
    const map = new CompositeMap<[object], string>()
    const obj1 = { key: "value" }
    const obj2 = { key: "value" } // Same content, different reference

    map.set([obj1], "stored")

    expect(map.get([obj1])).toBe("stored")
    expect(map.get([obj2])).toBeUndefined() // Should be undefined because references differ
  })

  it("should handle high-frequency collisions deterministically", () => {
    const map = new CompositeMap<object[], number>()
    const pool = Array.from({ length: 100 }, () => ({}))
    const entries = new Map<string, number>()

    // generate unique sets of three indices (order doesn't matter)
    while (entries.size < 1000) {
      const idx1 = Math.floor(Math.random() * pool.length)
      const idx2 = Math.floor(Math.random() * pool.length)
      const idx3 = Math.floor(Math.random() * pool.length)
      const sorted = [idx1, idx2, idx3].sort((a, b) => a - b)
      const keyStr = sorted.join("-")
      if (entries.has(keyStr)) continue
      const val = entries.size
      entries.set(keyStr, val)
      map.set(sorted.map(i => pool[i]) as object[], val)
    }

    for (const [rawKey, expectedVal] of entries) {
      const [i1, i2, i3] = rawKey.split("-").map(Number)
      const key = [pool[i1], pool[i2], pool[i3]]
      expect(map.get(key)).toBe(expectedVal)
    }
  })

  it("should allow overwriting values for the same composite key", () => {
    const map = new CompositeMap<[object, object], string>()
    const A = {}
    const B = {}

    map.set([A, B], "first")
    map.set([A, B], "second")

    expect(map.get([A, B])).toBe("second")
  })
})