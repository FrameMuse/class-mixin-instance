import { describe, it, expect, beforeEach } from 'bun:test';
import { forEachSettings } from '../util';

import { mixin } from '../..';

describe('Method chaining in mixins', () => {
	forEachSettings(() => {
		let calls: string[] = [];

		class Foo {
			public method() {
				calls.push('Foo');
				return 'foo';
			}
		}

		class Bar {
			public method() {
				calls.push('Bar');
				return 'bar';
			}
		}

		class Baz {
			public method() {
				calls.push('Baz');
				return 'baz';
			}
		}

		class FooBarBaz extends mixin(Foo, Bar, Baz) {}

		let instance: FooBarBaz;

		beforeEach(() => {
			calls = [];
			instance = new FooBarBaz();
		});

		it('should call all methods in order', () => {
			const result = instance.method();
			expect(calls).toEqual(['Foo', 'Bar', 'Baz']);
			expect(result).toBe('baz'); // returns the last one's value
		});
	});
});