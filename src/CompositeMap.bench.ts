import { bench } from "./bench.suite"
import { CompositeMap as CompositeMapV1 } from "./CompositeMap"
import { CompositeMap as CompositeMapV2 } from "./CompositeMap.v2"
import { CompositeMap as CompositeMapV3 } from "./CompositeMap.v3"

console.log("CompositeMap Benchmark")

await bench.untilCompiled()

using _ = bench.snapshot({ write: Bun.write })

{
  using _ = bench.group("Init")

  bench(() => new CompositeMapV1)
  bench(() => new CompositeMapV2)
  bench(() => new CompositeMapV3)
}

{
  using g = bench.group("Set")

  const f = g.fresh(() => ({
    mapV1: new CompositeMapV1,
    mapV2: new CompositeMapV2,
    mapV3: new CompositeMapV3,
  }))

  class O1 { }
  class O2 { }
  class O3 { }

  bench("set v1", () => f.mapV1.set([O1, O2, O3], {}))
  bench("set v2", () => f.mapV2.set([O1, O2, O3], {}))
  bench("set v3", () => f.mapV3.set([O1, O2, O3], {}))
}

{
  using g = bench.group("Get")

  const f = g.fresh(() => ({
    mapV1: new CompositeMapV1,
    mapV2: new CompositeMapV2,
    mapV3: new CompositeMapV3,
  }))

  class O1 { }
  class O2 { }
  class O3 { }

  bench("get v1", () => f.mapV1.get([O1, O2, O3]))
  bench("get v2", () => f.mapV2.get([O1, O2, O3]))
  bench("get v3", () => f.mapV3.get([O1, O2, O3]))
}

{
  using g = bench.group("Set (1000 keys)")

  const f = g.fresh(() => ({
    mapV1: new CompositeMapV1,
    mapV2: new CompositeMapV2,
    mapV3: new CompositeMapV3,
  }))

  const keys = Array.from({ length: 1_000 }).map(() => ({}))

  bench("set v1", () => f.mapV1.set(keys, {}))
  bench("set v2", () => f.mapV2.set(keys, {}))
  bench("set v3", () => f.mapV3.set(keys, {}))
}

{
  using g = bench.group("Get (1000 keys)")

  const f = g.fresh(() => ({
    mapV1: new CompositeMapV1,
    mapV2: new CompositeMapV2,
    mapV3: new CompositeMapV3,
  }))

  const keys = Array.from({ length: 1_000 }).map(() => ({}))

  bench("get v1", () => (f.mapV1.set(keys, {}), f.mapV1.get(keys)))
  bench("get v2", () => (f.mapV2.set(keys, {}), f.mapV2.get(keys)))
  bench("get v3", () => (f.mapV3.set(keys, {}), f.mapV3.get(keys)))
}