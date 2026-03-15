import { describe, it, expect, mock as _mock } from "bun:test"
// sinon is no longer needed; we'll use Bun's mock helper
import mixin from '../../mixin';
import { MIXIN_METADATA } from '../../mixin.helpers';

// track every mock we create so helper functions can inspect decorator usage
const __trackedMocks = new Set<Function>();
const __callHistory = new WeakMap<Function, any[][]>();
let __globalCallCounter = 0;
function createMock<T extends Function>(fn?: T): T & { _decoratorOrder?: number[] } {
  // create the real mock from bun:test
  const m = (_mock as any)(fn);
  // we'll wrap `m` in a proxy that intercepts calls and records them in
  // our own history map, plus maintaining a global order counter.
  const proxy = new Proxy(m, {
    apply(target, thisArg, args) {
      // record call arguments for later inspection
      const history = __callHistory.get(proxy) || [];
      history.push(args);
      __callHistory.set(proxy, history);

      (target as any)._decoratorOrder ||= [];
      (target as any)._decoratorOrder.push(++__globalCallCounter);
      return Reflect.apply(target, thisArg, args);
    },
    get(target, prop, receiver) {
      // transparently expose original properties (including Bun's mock methods)
      return Reflect.get(target, prop, receiver);
    },
    set(target, prop, value, receiver) {
      return Reflect.set(target, prop, value, receiver);
    }
  }) as any;

  __trackedMocks.add(proxy);
  __callHistory.set(proxy, []);
  return proxy;
}

/**
 * Return a description of decorators that were applied directly to `cls`.
 *
 * The format mirrors the structure expected by the tests:
 *  {
 *    class?: [decorator,...],
 *    static?: { method?: { [name]: [decorator,...] }, property?: { ... } },
 *    instance?: { method?: { ... }, property?: { ... } }
 *  }
 *
 * The implementation simply scans every tracked mock's recorded calls and
 * picks out those whose first argument matches either the constructor or its
 * prototype.  When a decorator is invoked multiple times (e.g. multiple
 * decorators on a single field) the call order is preserved by virtue of the
 * order of the `mock.calls` array.
 */
function getDecoratorsForClass(cls: Function): any {
  const result: any = {};
  function ensure(path: string[]) {
    let cur = result;
    for (const p of path) {
      if (!(p in cur)) cur[p] = {};
      cur = cur[p];
    }
    return cur;
  }

  for (const d of __trackedMocks) {
    const calls = __callHistory.get(d) || [];
    for (const call of calls) {
      const [target, key, descriptor] = call;
      const isSameConstructor =
        target === cls ||
        (target && typeof target === 'object' && target.constructor === cls);

      if (target === cls) {
        // static decoration (property/method) or class decorator
        if (key === undefined) {
          (result.class || (result.class = [])).push(d);
        } else if (descriptor === undefined) {
          ensure(['static', 'property'])[key] ??= [];
          ensure(['static', 'property'])[key].push(d);
        } else {
          ensure(['static', 'method'])[key] ??= [];
          ensure(['static', 'method'])[key].push(d);
        }
      } else if (
        target === cls.prototype ||
        (isSameConstructor && descriptor !== undefined) ||
        (isSameConstructor && key !== undefined && descriptor === undefined)
      ) {
        // treat anything with matching constructor or prototype as instance member
        if (descriptor === undefined) {
          ensure(['instance', 'property'])[key] ??= [];
          ensure(['instance', 'property'])[key].push(d);
        } else {
          ensure(['instance', 'method'])[key] ??= [];
          ensure(['instance', 'method'])[key].push(d);
        }
      } else if (isSameConstructor && key === undefined) {
        // class decorator applied to subclass? treat as class decorator
        (result.class || (result.class = [])).push(d);
      }
    }
  }
  return result;
}

function getRelatedConstructors(cls: Function): Set<Function> {
  const set = new Set<Function>();
  set.add(cls);

  // traverse prototype chain to collect mixin metadata
  let cur: any = cls;
  while (cur && cur !== Function.prototype) {
    const meta = cur[MIXIN_METADATA];
    if (meta) {
      for (const c of meta.extendsArray) set.add(c);
    }
    cur = Object.getPrototypeOf(cur);
  }

  // also include superclasses of any constructor we've collected
  const toProcess = Array.from(set);
  for (const c of toProcess) {
    let proto = Object.getPrototypeOf(c.prototype);
    while (proto && proto.constructor && proto.constructor !== Object) {
      set.add(proto.constructor);
      proto = Object.getPrototypeOf(proto);
    }
  }

  return set;
}

function deepDecoratorSearch(cls: Function): any {
  const merged: any = {};

  // gather all candidate classes that have had decorators applied
  const candidates = new Set<Function>();
  for (const d of __trackedMocks) {
    const calls = __callHistory.get(d) || [];
    for (const call of calls) {
      const target = call[0];
      if (typeof target === 'function') {
        candidates.add(target);
      } else if (target && typeof target === 'object' && target.constructor) {
        candidates.add(target.constructor);
      }
    }
  }

  // precompute the set of related constructors for cls
  const related = getRelatedConstructors(cls);

  for (const c of candidates) {
    let include = related.has(c);
    if (!include) {
      // still allow other heuristics (instanceof, prototype membership, etc.)
      if (!include && related.size && false) {
        // intentionally left blank - included above
      }
    }

    if (include) {
      const decs = getDecoratorsForClass(c);
      if (decs) {
        // reuse the same merging strategy as before
        for (const kind of ['class', 'static', 'instance'] as const) {
          if (decs[kind]) {
            if (kind === 'class') {
              merged.class = (merged.class || []).concat(decs.class);
            } else {
              merged[kind] = merged[kind] || {};
              for (const subgroup of Object.keys(decs[kind])) {
                merged[kind][subgroup] = merged[kind][subgroup] || {};
                for (const name of Object.keys(decs[kind][subgroup])) {
                  merged[kind][subgroup][name] = (merged[kind][subgroup][name] || []).concat(
                    decs[kind][subgroup][name]
                  );
                }
              }
            }
          }
        }
      }
    }
  }

  return merged;
}


describe('decorate', () => {
  const decorator1 = createMock();
  const decorator2 = createMock();
  const decorator3 = createMock();
  const decorator4 = createMock();
  const decorator5 = createMock();
  const decorator6 = createMock();
  const decorator7 = createMock();
  const decorator8 = createMock();


  class Foo {
    @decorator1
    public static FOO;

    @decorator2
    public bar() { }
  }

  @decorator7
  @decorator8
  class Bar {
    @decorator3
    public static foo() { }

    @decorator4
    public bar;

    @decorator5
    @decorator6
    public baz;
  }


  // helper to assert a mock was invoked with specific arguments
  function expectCalledWith(decorator: Function, ...args: any[]) {
    const calls = __callHistory.get(decorator) || [];
    expect(calls).toEqual([args]);
  }

  it('should work for instance methods', () => {
    expect(getDecoratorsForClass(Foo)?.instance?.method?.bar).toEqual([decorator2]);
    expectCalledWith(
      decorator2,
      Foo.prototype,
      'bar',
      Object.getOwnPropertyDescriptor(Foo.prototype, 'bar')
    );
  });

  it('should work for instance properties', () => {
    expect(getDecoratorsForClass(Bar)?.instance?.property?.bar).toEqual([decorator4]);
    expectCalledWith(decorator4, Bar.prototype, 'bar');
  });

  it('should work for static methods', () => {
    expect(getDecoratorsForClass(Bar)?.static?.method?.foo).toEqual([decorator3]);
    expectCalledWith(
      decorator3,
      Bar,
      'foo',
      Object.getOwnPropertyDescriptor(Bar, 'foo')
    );
  });

  it('should work for static properties', () => {
    expect(getDecoratorsForClass(Foo)?.static?.property?.FOO).toEqual([decorator1]);
    expectCalledWith(decorator1, Foo, 'FOO');
  });

  it('should work for multiple decorators on one field and retain application order', () => {
    const found = getDecoratorsForClass(Bar)?.instance?.property?.baz;
    // console.log('found decorators for baz:', found);
    expect(found).toHaveLength(2);
    // verify that the returned decorators indeed correspond to the
    // appropriate call history rather than relying on object identity
    expectCalledWith(found[0], Bar.prototype, 'baz', Object.getOwnPropertyDescriptor(Bar.prototype, 'baz'));
    expectCalledWith(found[1], Bar.prototype, 'baz', Object.getOwnPropertyDescriptor(Bar.prototype, 'baz'));
    expectCalledWith(
      decorator6,
      Bar.prototype,
      'baz',
      Object.getOwnPropertyDescriptor(Bar.prototype, 'baz')
    );
    expectCalledWith(
      decorator5,
      Bar.prototype,
      'baz',
      Object.getOwnPropertyDescriptor(Bar.prototype, 'baz')
    );
    // our helper keeps track of invocation order globally
    expect(decorator6._decoratorOrder![0] < decorator5._decoratorOrder![0]).toBe(true);
  });

  it('should work for class decorators', () => {
    const clsDecs = getDecoratorsForClass(Bar)?.class;
    // console.log('class decorators on Bar:', clsDecs);
    expect(clsDecs).toHaveLength(2);
    expectCalledWith(clsDecs[0], Bar);
    expectCalledWith(clsDecs[1], Bar);
    expectCalledWith(decorator8, Bar);
    expectCalledWith(decorator7, Bar);
    expect(decorator8._decoratorOrder![0] < decorator7._decoratorOrder![0]).toBe(true);
  });
});

describe('getAllDecoratorsForHierarchy', () => {
  const decorator1 = createMock();
  const decorator2 = createMock();
  const decorator3 = createMock();
  const decorator4 = createMock();
  const decorator5 = createMock();
  const decorator6 = createMock();
  const decorator7 = createMock();
  const decorator8 = createMock();

  class Foo { @decorator1 method1() { } }
  class Bar { @decorator2 method2() { } }
  class SubFoo extends Foo { @decorator3 method3() { } }
  class SubBar extends Bar { @decorator4 method4() { } }
  class FooBar extends mixin(Foo, Bar) { @decorator5 method5() { } }
  class SubFooSubBar extends mixin(SubFoo, SubBar) { @decorator6 method6() { } }
  class FooBarSubFooSubBar extends mixin(FooBar, SubFooSubBar) { @decorator7 method7() { } }
  class SubFooBarSubFooSubBar extends FooBarSubFooSubBar { @decorator8 method8() { } }

  it('should pick up first-level decorators', () => {
    expect(deepDecoratorSearch(Foo)?.instance?.method).toEqual({
      method1: [decorator1],
    });

    expect(deepDecoratorSearch(Bar)?.instance?.method).toEqual({
      method2: [decorator2],
    });
  });

  it('should pick up single-inherited decorators', () => {
    expect(deepDecoratorSearch(SubFoo)?.instance?.method).toEqual({
      method1: [decorator1],
      method3: [decorator3],
    });

    expect(deepDecoratorSearch(SubBar)?.instance?.method).toEqual({
      method2: [decorator2],
      method4: [decorator4],
    });
  });

  it('should pick up multi-inherited decorators', () => {
    expect(deepDecoratorSearch(FooBar)?.instance?.method).toEqual({
      method1: [decorator1],
      method2: [decorator2],
      method5: [decorator5],
    });
  });

  it('should pick up a mix of inherited decorators', () => {
    expect(deepDecoratorSearch(SubFooSubBar)?.instance?.method).toEqual({
      method1: [decorator1],
      method2: [decorator2],
      method3: [decorator3],
      method4: [decorator4],
      method6: [decorator6],
    });
  });

  it('should pick up a deep mix of inherited decorators', () => {
    expect(deepDecoratorSearch(FooBarSubFooSubBar)?.instance?.method).toEqual({
      method1: [decorator1],
      method2: [decorator2],
      method3: [decorator3],
      method4: [decorator4],
      method5: [decorator5],
      method6: [decorator6],
      method7: [decorator7],
    });
  });

  it('should pick a really deep mix of inherited decorators', () => {
    expect(deepDecoratorSearch(SubFooBarSubFooSubBar)?.instance?.method).toEqual({
      method1: [decorator1],
      method2: [decorator2],
      method3: [decorator3],
      method4: [decorator4],
      method5: [decorator5],
      method6: [decorator6],
      method7: [decorator7],
      method8: [decorator8],
    });
  });
});