type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never;
type ABC = abstract new (...args: never[]) => unknown;
type Mixin<T extends ABC> = MixinConstructor<T>;
type MixinConstructor<T extends ABC> = new () => UnionToIntersection<InstanceType<T>>;
declare function mixin<T extends (abstract new () => void)[]>(...constructors: T): Mixin<T[number]>;
declare namespace mixin {
    function member<T extends new (...args: any[]) => any>(target: T): T;
}

export { mixin };
