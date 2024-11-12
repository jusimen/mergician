import { isObject } from '../src/util.js';
import { mergekit } from '../src/index.js';

// Test Objects
// ============================================================================
const testObj1 = { a: 1, b: [1, 1], c: { x: 1 }, d: true };
const testObj2 = { a: 2, b: [2, 2], c: { x: 2, y: [2, '😀'] }, e: null };
const testObj3 = { a: 3, b: [3, 3], c: { x: 3, y: [3, '😀'], z: 3 } };
const testObjCircular = {
  a: 1,
  get circular() {
    return this;
  }
};
const testPerson = Object.create(
  // Prototype (standard object)
  Object.create(null, {
    enumerableTrue: {
      configurable: true,
      enumerable: true,
      value: true,
      writable: true
    },
    enumerableFalse: {
      configurable: true,
      enumerable: false,
      value: false,
      writable: true
    }
  }),
  // Properties (descriptors object)
  {
    firstName: {
      enumerable: true,
      value: 'John',
      writable: true
    },
    lastName: {
      enumerable: true,
      value: 'Smith',
      writable: true
    },
    fullName: {
      enumerable: false,
      get() {
        return `${this.firstName} ${this.lastName}`;
      },
      set(val) {
        const names = val.replace(/\s+/g, ' ').trim().split(' ');

        this.firstName = names[0] || '';
        this.lastName = names[1] || '';
      }
    }
  }
);

// Tests
// ============================================================================
describe('Clone', () => {
  test('arrays', () => {
    const testObj = { a: [1, 1] };
    const mergedObj = mergekit({}, testObj);
    const mergedDescriptors = Object.getOwnPropertyDescriptors(mergedObj);
    const testDescriptors = Object.getOwnPropertyDescriptors(testObj);

    expect(mergedDescriptors).toMatchObject(testDescriptors);
    expect(mergedObj.a).not.toBe(testObj.a);
  });

  test('dates', () => {
    const testObj = { a: new Date() };
    const mergedObj = mergekit({}, testObj);
    const mergedDescriptors = Object.getOwnPropertyDescriptors(mergedObj);
    const testDescriptors = Object.getOwnPropertyDescriptors(testObj);

    expect(mergedDescriptors).toMatchObject(testDescriptors);
    expect(mergedObj.a).not.toBe(testObj.a);
  });

  test('object literals', () => {
    const testObj = { a: { b: 1 } };
    const mergedObj = mergekit({}, testObj);
    const mergedDescriptors = Object.getOwnPropertyDescriptors(mergedObj);
    const testDescriptors = Object.getOwnPropertyDescriptors(testObj);

    expect(mergedDescriptors).toMatchObject(testDescriptors);
    expect(mergedObj.a).not.toBe(testObj.a);
  });

  test('falsey values', () => {
    const testObj = { a: null, b: undefined, c: '', d: 0, e: false };
    const mergedObj = mergekit({}, testObj);
    const mergedDescriptors = Object.getOwnPropertyDescriptors(mergedObj);
    const testDescriptors = Object.getOwnPropertyDescriptors(testObj);

    expect(mergedDescriptors).toMatchObject(testDescriptors);
  });

  test('own properties', () => {
    const mergedObj = mergekit({}, testPerson);
    const mergedDescriptors = Object.getOwnPropertyDescriptors(mergedObj);
    const testDescriptors = Object.getOwnPropertyDescriptors(testPerson);

    expect(mergedDescriptors).toMatchObject(testDescriptors);
  });

  test('custom prototype properties', () => {
    const mergedObj = mergekit({}, testPerson);
    const mergedProto = Object.getPrototypeOf(mergedObj);
    const mergedProtoDescriptors =
      Object.getOwnPropertyDescriptors(mergedProto);
    const testProto = Object.getPrototypeOf(testPerson);
    const testProtoDescriptors = Object.getOwnPropertyDescriptors(testProto);

    expect(mergedProtoDescriptors).toMatchObject(testProtoDescriptors);
  });

  test('circular object', () => {
    const mergedObj = mergekit({}, testObjCircular);

    expect(mergedObj.a).toBe(1);
    expect(mergedObj.circular.a).toBe(1);
    expect(mergedObj.circular.circular.a).toBe(1);
    expect(mergedObj).toMatchSnapshot();
  });
});

describe('Merge', () => {
  test('deep two objects', () => {
    const mergedObj = mergekit(testObj1, testObj2);

    expect(mergedObj.b).not.toBe(testObj2.b);
    expect(mergedObj.c).not.toBe(testObj2.c);
    expect(mergedObj).toMatchSnapshot();
  });

  test('deep three objects', () => {
    const mergedObj = mergekit(testObj1, testObj2, testObj3);

    expect(mergedObj).toMatchSnapshot();
  });

  test('deep custom prototype properties', () => {
    const testObj1 = Object.create(
      {
        value() {
          return 1;
        }
      },
      Object.getOwnPropertyDescriptors({ foo: true })
    );
    const testObj2 = Object.create(
      {
        value() {
          return 2;
        }
      },
      Object.getOwnPropertyDescriptors({ bar: true })
    );
    const mergedObj = mergekit(testObj1, testObj2);

    expect(mergedObj).toHaveProperty('foo');
    expect(mergedObj).toHaveProperty('bar');
    expect(mergedObj).toHaveProperty('value');
    expect(mergedObj.value()).toBe(2);
  });
});

describe('Options', () => {
  test('passing options returns custom merge function', () => {
    const customMerge = mergekit({}); // Defaults

    expect(typeof customMerge).toBe('function');
  });

  describe('Keys', () => {
    test('onlyKeys', () => {
      const mergedObj = mergekit({
        onlyKeys: ['a', 'c', 'x']
      })(testObj1, testObj2, testObj3);

      expect(mergedObj).toMatchSnapshot();
    });

    test('skipKeys', () => {
      const mergedObj = mergekit({
        skipKeys: ['a', 'x']
      })(testObj1, testObj2, testObj3);

      expect(mergedObj).toMatchSnapshot();
    });

    test('onlyKeys + skipKeys', () => {
      const mergedObj = mergekit({
        onlyKeys: ['a', 'b'],
        skipKeys: ['b']
      })(testObj1, testObj2, testObj3);

      expect(mergedObj).toMatchSnapshot();
    });

    test('onlyCommonKeys', () => {
      const mergedObj = mergekit({
        onlyCommonKeys: true
      })(testObj1, testObj2, testObj3);

      expect(mergedObj).toMatchSnapshot();
    });

    test('onlyCommonKeys + onlyKeys', () => {
      const mergedObj = mergekit({
        onlyKeys: ['b', 'c', 'x', 'z'],
        onlyCommonKeys: true
      })(testObj1, testObj2, testObj3);

      expect(mergedObj).toMatchSnapshot();
    });

    test('onlyCommonKeys + skipKeys', () => {
      const mergedObj = mergekit({
        skipKeys: ['a', 'z'],
        onlyCommonKeys: true
      })(testObj1, testObj2, testObj3);

      expect(mergedObj).toMatchSnapshot();
    });

    test('onlyUniversalKeys', () => {
      const mergedObj = mergekit({
        onlyUniversalKeys: true
      })(testObj1, testObj2, testObj3);

      expect(mergedObj).toMatchSnapshot();
    });

    test('onlyUniversalKeys + onlyKeys', () => {
      const mergedObj = mergekit({
        onlyKeys: ['a'],
        onlyUniversalKeys: true
      })(testObj1, testObj2, testObj3);

      expect(mergedObj).toMatchSnapshot();
    });

    test('onlyUniversalKeys + skipKeys', () => {
      const mergedObj = mergekit({
        skipKeys: ['a'],
        onlyUniversalKeys: true
      })(testObj1, testObj2, testObj3);

      expect(mergedObj).toMatchSnapshot();
    });

    test('skipCommonKeys', () => {
      const mergedObj = mergekit({
        skipCommonKeys: true
      })(testObj1, testObj2, testObj3);

      expect(mergedObj).toMatchSnapshot();
    });

    test('skipCommonKeys + onlyKeys', () => {
      const mergedObj = mergekit({
        onlyKeys: ['d'],
        skipCommonKeys: true
      })(testObj1, testObj2, testObj3);

      expect(mergedObj).toMatchSnapshot();
    });

    test('skipCommonKeys + skipKeys', () => {
      const mergedObj = mergekit({
        skipKeys: ['d'],
        skipCommonKeys: true
      })(testObj1, testObj2, testObj3);

      expect(mergedObj).toMatchSnapshot();
    });

    test('skipUniversalKeys', () => {
      const mergedObj = mergekit({
        skipUniversalKeys: true
      })(testObj1, testObj2, testObj3);

      expect(mergedObj).toMatchSnapshot();
    });

    test('skipUniversalKeys + onlyKeys', () => {
      const mergedObj = mergekit({
        onlyKeys: ['d'],
        skipUniversalKeys: true
      })(testObj1, testObj2, testObj3);

      expect(mergedObj).toMatchSnapshot();
    });

    test('skipUniversalKeys + skipKeys', () => {
      const mergedObj = mergekit({
        skipKeys: ['c'],
        skipUniversalKeys: true
      })(testObj1, testObj2, testObj3);

      expect(mergedObj).toMatchSnapshot();
    });

    test('hoistEnumerable = false', () => {
      const mergedObj = mergekit({
        hoistEnumerable: false
      })({}, testPerson);
      const mergedNames = Object.getOwnPropertyNames(mergedObj);
      const testNames = Object.getOwnPropertyNames(testPerson);

      expect(mergedNames).toMatchObject(testNames);
      expect(mergedNames).toMatchSnapshot();
    });

    test('hoistEnumerable = true', () => {
      const mergedObj = mergekit({
        hoistEnumerable: true
      })({}, testPerson);
      const mergedNames = Object.getOwnPropertyNames(mergedObj);
      const testPropNames = Object.getOwnPropertyNames(testPerson);
      const testProtoPropNames = Object.keys(Object.getPrototypeOf(testPerson));
      const testNames = [...new Set([...testPropNames, ...testProtoPropNames])];

      expect(mergedNames).toMatchObject(testNames);
      expect(mergedNames).toMatchSnapshot();
    });

    test('hoistProto = false', () => {
      const mergedObj = mergekit({
        hoistProto: false
      })({}, testPerson);
      const mergedNames = Object.getOwnPropertyNames(mergedObj);
      const testNames = Object.getOwnPropertyNames(testPerson);

      expect(mergedNames).toMatchObject(testNames);
      expect(mergedNames).toMatchSnapshot();
    });

    test('hoistProto = true', () => {
      const mergedObj = mergekit({
        hoistProto: true
      })({}, testPerson);
      const mergedNames = Object.getOwnPropertyNames(mergedObj);
      const testPropNames = Object.getOwnPropertyNames(testPerson);
      const testProtoPropNames = Object.getOwnPropertyNames(
        Object.getPrototypeOf(testPerson)
      );
      const testNames = [...new Set([...testProtoPropNames, ...testPropNames])];

      expect(mergedNames).toMatchObject(testNames);
      expect(mergedNames).toMatchSnapshot();
    });

    test('skipProto = false', () => {
      const mergedObj = mergekit({
        skipProto: false
      })({}, testPerson);
      const mergedProto = Object.getPrototypeOf(mergedObj);
      const mergedProtoDescriptors =
        Object.getOwnPropertyDescriptors(mergedProto);
      const testProto = Object.getPrototypeOf(testPerson);
      const testProtoDescriptors = Object.getOwnPropertyDescriptors(testProto);

      expect(mergedProtoDescriptors).toMatchObject(testProtoDescriptors);
    });

    test('skipProto = true', () => {
      const mergedObj = mergekit({
        skipProto: true
      })({}, testPerson);
      const mergedProto = Object.getPrototypeOf(mergedObj);

      expect(mergedProto).toMatchObject(Object.prototype);
    });
  });

  describe('Values', () => {
    test('invokeGetters = false', () => {
      const mergedObj = mergekit({
        invokeGetters: false
      })({}, testPerson);
      const getterDescriptor = Object.getOwnPropertyDescriptor(
        mergedObj,
        'fullName'
      );

      expect(typeof getterDescriptor.get).toBe('function');
      expect(mergedObj.fullName).toEqual(testPerson.fullName);
    });

    test('invokeGetters = true', () => {
      const mergedObj = mergekit({
        invokeGetters: true
      })({}, testPerson);
      const getterDescriptor = Object.getOwnPropertyDescriptor(
        mergedObj,
        'fullName'
      );

      expect(getterDescriptor).not.toHaveProperty('get');
      expect(getterDescriptor).toHaveProperty('value');
      expect(getterDescriptor.value).toEqual(mergedObj.fullName);
    });

    test('skipSetters = false', () => {
      const mergedObj = mergekit({
        skipSetters: false
      })({}, testPerson);
      const setterDescriptor = Object.getOwnPropertyDescriptor(
        mergedObj,
        'fullName'
      );
      const newValue = '   Jane Doe   ';

      mergedObj.fullName = newValue;

      expect(typeof setterDescriptor.set).toBe('function');
      expect(mergedObj.fullName).toEqual(newValue.trim());
    });

    test('skipSetters = true', () => {
      const mergedObj = mergekit({
        skipSetters: true
      })({}, testPerson);
      const setterDescriptor = Object.getOwnPropertyDescriptor(
        mergedObj,
        'fullName'
      );

      expect(setterDescriptor.set).toBeUndefined();
      expect(mergedObj.fullName).toEqual(testPerson.fullName);
    });
  });

  describe('Arrays', () => {
    const testObj1 = { a: [1, 1] };
    const testObj2 = { a: [2, 2], b: [2, [2, 2]], c: { d: [2, 2, '😀'] } };
    const testObj3 = { a: [3, 3], b: [3, [3, 3]], c: { d: [3, 3, '😀'] } };

    test('appendArrays', () => {
      const mergedObj = mergekit({
        appendArrays: true
      })(testObj1, testObj2, testObj3);

      expect(mergedObj).toMatchSnapshot();
    });

    test('prependArrays', () => {
      const mergedObj = mergekit({
        prependArrays: true
      })(testObj1, testObj2, testObj3);

      expect(mergedObj).toMatchSnapshot();
    });

    test('dedupArrays', () => {
      const mergedObj = mergekit({
        appendArrays: true,
        dedupArrays: true
      })({}, testObj2);

      expect(mergedObj).toMatchSnapshot();
    });

    test('dedupArrays + appendArrays', () => {
      const mergedObj = mergekit({
        appendArrays: true,
        dedupArrays: true
      })(testObj1, testObj2, testObj3);

      expect(mergedObj).toMatchSnapshot();
    });

    test('dedupArrays + prependArrays', () => {
      const mergedObj = mergekit({
        prependArrays: true,
        dedupArrays: true
      })(testObj1, testObj2, testObj3);

      expect(mergedObj).toMatchSnapshot();
    });

    test('dedupArrays + afterEach (mergeVal should be deduped)', () => {
      const mergedObj = mergekit({
        appendArrays: true,
        dedupArrays: true,
        afterEach({ mergeVal }) {
          expect(mergeVal).toHaveLength(1);
        }
      })({ test: [1, 1] }, { test: [1, 1] });

      expect(mergedObj).toMatchSnapshot();
    });

    test('sortArrays with boolean', () => {
      const mergedObj = mergekit({
        appendArrays: true,
        sortArrays: true
      })(testObj1, testObj2, testObj3);

      expect(mergedObj).toMatchSnapshot();
    });

    test('sortArrays with function', () => {
      const mergedObj = mergekit({
        appendArrays: true,
        sortArrays(a, b) {
          if (typeof b === 'number') {
            return b - a;
          } else {
            return -1;
          }
        }
      })(testObj1, testObj2, testObj3);

      expect(mergedObj).toMatchSnapshot();
    });

    test('sortArrays + afterEach (mergeVal should be sorted)', () => {
      const sortedArrays = [
        [1, 2],
        [3, 4],
        [1, 2, 3, 4]
      ];
      const mergedObj = mergekit({
        appendArrays: true,
        sortArrays: true,
        afterEach({ mergeVal }) {
          expect(sortedArrays).toContainEqual(mergeVal);
        }
      })({ test: [2, 1] }, { test: [4, 3] });

      expect(mergedObj).toMatchSnapshot();
    });
  });

  describe('Callbacks', () => {
    const testObj1 = { a: 1, b: { c: 'foo' } };
    const testObj2 = { a: 2, b: { c: 'bar' } };

    test('filter() arguments', () => {
      const conditionsTested = [];
      const mergedObj = mergekit({
        filter({ depth, key, srcObj, srcVal, targetObj, targetVal }) {
          expect(isObject(srcObj)).toBe(true);
          expect(typeof key).toBe('string');
          expect(isObject(targetObj)).toBe(true);
          expect(typeof depth).toBe('number');

          /* eslint-disable jest/no-conditional-expect */
          if (srcVal === 1) {
            expect(key).toBe('a');
            conditionsTested.push('srcVal/key');
          }
          if (srcVal === 2) {
            expect(targetVal).toBe(1);
            conditionsTested.push('srcVal/targetVal');
          }
          if (srcObj === testObj2 && key === 'a') {
            expect(depth).toBe(0);
            conditionsTested.push('depth:0');
          }
          if (srcObj === testObj2.b && key === 'c') {
            expect(depth).toBe(1);
            conditionsTested.push('depth:1');
          }
          /* eslint-enable jest/no-conditional-expect */

          return srcVal;
        }
      })(testObj1, testObj2);

      expect(conditionsTested).toHaveLength(4);
      expect(mergedObj).toMatchSnapshot();
    });

    test('filter() true', () => {
      const mergedObj = mergekit({
        filter({ key }) {
          return key === 'a';
        }
      })(testObj1, testObj2);

      expect(mergedObj).toMatchSnapshot();
    });

    test('filter() false', () => {
      const mergedObj = mergekit({
        filter({ key }) {
          return key !== 'a';
        }
      })(testObj1, testObj2);

      expect(mergedObj).toMatchSnapshot();
    });

    test('filter() without return value', () => {
      const mergedObj = mergekit({
        filter() {}
      })(testObj1, testObj2);

      expect(mergedObj).toMatchSnapshot();
    });

    test('beforeEach() arguments', () => {
      const testObj1 = { a: 1, b: { c: 'foo' } };
      const testObj2 = { a: 2, b: { c: 'bar' } };

      const conditionsTested = [];

      const mergedObj = mergekit({
        beforeEach({ depth, key, srcObj, srcVal, targetObj, targetVal }) {
          expect(typeof depth).toBe('number');
          expect(typeof key).toBe('string');
          expect(isObject(srcObj)).toBe(true);
          expect(isObject(targetObj)).toBe(true);

          /* eslint-disable jest/no-conditional-expect */
          if (srcVal === 1) {
            expect(key).toBe('a');
            conditionsTested.push('srcVal/key');
          }
          if (srcVal === 2) {
            expect(targetVal).toBe(1);
            conditionsTested.push('srcVal/targetVal');
          }
          if (srcObj === testObj2 && key === 'a') {
            expect(depth).toBe(0);
            conditionsTested.push('depth:0');
          }
          if (srcObj === testObj2.b && key === 'c') {
            expect(depth).toBe(1);
            conditionsTested.push('depth:1');
          }
          /* eslint-enable jest/no-conditional-expect */

          return srcVal;
        }
      })(testObj1, testObj2);

      expect(conditionsTested).toHaveLength(4);
      expect(mergedObj).toMatchSnapshot();
    });

    test('beforeEach() with return value', () => {
      const mergedObj = mergekit({
        beforeEach() {
          return 'baz';
        }
      })({}, testPerson);

      expect(mergedObj).toMatchSnapshot();
    });

    test('beforeEach() without return value', () => {
      const mergedObj = mergekit({
        beforeEach() {}
      })(testObj1, testObj2);

      expect(mergedObj).toMatchSnapshot();
    });

    test('afterEach() arguments', () => {
      const testObj1 = { a: 1, b: { c: 'foo' } };
      const testObj2 = { a: 2, b: { c: 'bar' } };

      const conditionsTested = [];

      const mergedObj = mergekit({
        afterEach({ depth, key, mergeVal, srcObj, targetObj }) {
          expect(typeof depth).toBe('number');
          expect(typeof key).toBe('string');
          expect(isObject(targetObj)).toBe(true);

          /* eslint-disable jest/no-conditional-expect */
          if (mergeVal === 2) {
            expect(key).toBe('a');
            conditionsTested.push('mergeVal/key');

            expect(depth).toBe(0);
            conditionsTested.push('depth:0');

            expect(srcObj).toBe(testObj2);
            conditionsTested.push('srcObj');
          }
          if (mergeVal === 'bar') {
            expect(depth).toBe(1);
            conditionsTested.push('depth:1');
          }
          /* eslint-enable jest/no-conditional-expect */

          return mergeVal;
        }
      })(testObj1, testObj2);

      expect(conditionsTested).toHaveLength(4);
      expect(mergedObj).toMatchSnapshot();
    });

    test('afterEach() return value', () => {
      const mergedObj = mergekit({
        afterEach() {
          return 'baz';
        }
      })(testObj1, testObj2);

      expect(mergedObj).toMatchSnapshot();
    });

    test('afterEach() without return value', () => {
      const mergedObj = mergekit({
        afterEach() {}
      })(testObj1, testObj2);

      expect(mergedObj).toMatchSnapshot();
    });

    test('onCircular() arguments', () => {
      const mergedObj = mergekit({
        onCircular({ depth, key, srcObj, srcVal, targetObj, targetVal }) {
          expect(typeof depth).toBe('number');
          expect(typeof key).toBe('string');
          expect(isObject(srcObj)).toBe(true);
          expect(isObject(srcVal)).toBe(true);
          expect(srcVal).toBe(srcObj);
          expect(isObject(targetObj)).toBe(true);
        }
      })({}, testObjCircular);

      expect(mergedObj).toMatchSnapshot();
    });

    test('onCircular() without return value', () => {
      const mergedObj = mergekit({
        onCircular() {}
      })({}, testObjCircular);

      expect(mergedObj).toMatchSnapshot();
      expect(mergedObj.a).toBe(1);
      expect(mergedObj.circular.a).toBe(1);
      expect(mergedObj.circular.circular.a).toBe(1);
    });

    test('onCircular() with return value', () => {
      const mergedObj = mergekit({
        onCircular() {
          return true;
        }
      })({}, testObjCircular);

      expect(mergedObj).toMatchSnapshot();
    });
  });

  test('custom merge function accepts options', () => {
    const customMerge1 = mergekit({ onlyKeys: ['b'], appendArrays: true });

    expect(typeof customMerge1).toBe('function');

    const customMerge2 = customMerge1({ dedupArrays: true });

    expect(typeof customMerge2).toBe('function');

    const mergedObj1 = customMerge1(testObj1, testObj2, testObj3);
    const mergedObj2 = customMerge2(testObj1, testObj2, testObj3);

    expect(mergedObj1).toMatchSnapshot();
    expect(mergedObj2).toMatchSnapshot();
  });
});

describe('Accessors', () => {
  test('handles getters', () => {
    const obj1 = {
      a: 1,
      get getVal() {
        return 'foo';
      }
    };
    const obj2 = {
      b: 2,
      get getVal() {
        return 'bar';
      }
    };
    const mergedObj = mergekit(obj1, obj2);
    const getDescriptor = Object.getOwnPropertyDescriptor(mergedObj, 'getVal');

    expect(typeof mergedObj.a).toBe('number');
    expect('get' in getDescriptor).toBe(true);
    expect(typeof getDescriptor.get).toBe('function');
    expect(mergedObj).toMatchSnapshot();
  });

  test('handles setters', () => {
    const obj1 = {
      a: 1,
      set setVal(val) {
        this.a = val;
      }
    };
    const obj2 = {
      a: 2,
      set setVal(val) {
        this.a = val;
      }
    };
    const mergedObj = mergekit(obj1, obj2);
    const setDescriptor = Object.getOwnPropertyDescriptor(mergedObj, 'setVal');

    expect(typeof mergedObj.a).toBe('number');
    expect('get' in setDescriptor).toBe(true);
    expect(typeof setDescriptor.set).toBe('function');
    mergedObj.setVal = 'foo';
    expect(mergedObj.a).toBe('foo');
    expect(mergedObj).toMatchSnapshot();
  });

  test('handles getter/setter arrays', () => {
    const obj1 = {
      a: null,
      get getVal() {
        return [1, 1];
      }
    };
    const obj2 = {
      a: null,
      get getVal() {
        return [3, 3];
      },
      set setVal(val) {
        this.a = [val, val];
      }
    };
    const mergedObj = mergekit({
      appendArrays: true,
      dedupArrays: true
    })(obj1, obj2);

    // Getter
    expect(Array.isArray(mergedObj.getVal)).toBe(true);
    expect(mergedObj.getVal).toHaveLength(1);

    // Setter
    expect(mergedObj.a).toBeNull();
    mergedObj.setVal = true;
    expect(Array.isArray(mergedObj.a)).toBe(true);
    expect(mergedObj.a).toHaveLength(2);

    expect(mergedObj).toMatchSnapshot();
  });

  test('handles getter/setter objects', () => {
    const obj1 = {
      a: null,
      get getVal() {
        return { x: 1 };
      },
      set setVal(val) {
        this.a = { x: 3 };
      }
    };
    const obj2 = {
      a: null,
      get getVal() {
        return { x: 2 };
      },
      set setVal(val) {
        this.a = { x: 4 };
      }
    };
    const mergedObj = mergekit(obj1, obj2);

    // Getter
    expect(isObject(mergedObj.getVal)).toBe(true);
    expect(mergedObj.getVal.x).toBe(2);

    // Setter
    expect(mergedObj.a).toBeNull();
    mergedObj.setVal = true;
    expect(isObject(mergedObj.a)).toBe(true);
    expect(mergedObj.a.x).toBe(4);

    expect(mergedObj).toMatchSnapshot();
  });

  test('handles getter/setter return objects from callbacks', () => {
    const obj1 = { a: 1, b: 1, c: 1, d: 1 };
    const mergedObj = mergekit({
      beforeEach({ key }) {
        if (key === 'a') {
          return {
            enumerable: true,
            get() {
              return 'foo';
            },
            set() {
              this.testa = 'bar';
            }
          };
        }
        if (key === 'b') {
          return {
            configurable: true,
            enumerable: true,
            value: 2,
            writable: true
          };
        }
      },
      afterEach({ key }) {
        if (key === 'c') {
          return {
            enumerable: true,
            get() {
              return 'baz';
            },
            set() {
              this.testc = 'qux';
            }
          };
        }
        if (key === 'd') {
          return {
            value: 2,
            writable: true,
            configurable: true,
            enumerable: true
          };
        }
      }
    })({}, obj1);
    const aDescriptor = Object.getOwnPropertyDescriptor(mergedObj, 'a');
    const cDescriptor = Object.getOwnPropertyDescriptor(mergedObj, 'c');

    expect(typeof mergedObj.a).toBe('string');
    expect(mergedObj.a).toBe('foo');
    expect('get' in aDescriptor).toBe(true);
    expect(typeof aDescriptor.get).toBe('function');
    expect('set' in aDescriptor).toBe(true);
    expect(typeof aDescriptor.set).toBe('function');
    expect(mergedObj.testa).toBeUndefined();
    mergedObj.a = 2;
    expect(mergedObj.testa).toBe('bar');

    expect(typeof mergedObj.b).toBe('number');
    expect(mergedObj.b).toBe(2);

    expect(typeof mergedObj.c).toBe('string');
    expect(mergedObj.c).toBe('baz');
    expect('get' in cDescriptor).toBe(true);
    expect(typeof cDescriptor.get).toBe('function');
    expect('set' in cDescriptor).toBe(true);
    expect(typeof cDescriptor.set).toBe('function');
    expect(mergedObj.testc).toBeUndefined();
    mergedObj.c = 2;
    expect(mergedObj.testc).toBe('qux');

    expect(typeof mergedObj.d).toBe('number');
    expect(mergedObj.d).toBe(2);

    expect(mergedObj).toMatchSnapshot();
  });
});

describe('Handle arrays of objects', () => {
  test('merges arrays of objects without duplicates', () => {
    const obj1 = {
      a: [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' }
      ]
    };
    const obj2 = {
      a: [
        { id: 1, name: 'Alice' },
        { id: 3, name: 'Charlie' }
      ]
    };

    const mergedObj = mergekit({
      dedupArrays: true,
      appendArrays: true
    })(obj1, obj2);

    expect(mergedObj.a).toHaveLength(3); // Expecting 3 unique objects
    expect(mergedObj.a).toEqual([
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
      { id: 3, name: 'Charlie' }
    ]);
  });

  test('handles empty arrays correctly', () => {
    const obj1 = {
      a: []
    };
    const obj2 = {
      a: [{ id: 1, name: 'Alice' }]
    };

    const mergedObj = mergekit({ appendArrays: true })(obj1, obj2);

    expect(mergedObj.a).toHaveLength(1); // Expecting 1 object
    expect(mergedObj.a).toEqual([{ id: 1, name: 'Alice' }]);
  });

  test('handles arrays with non-object values', () => {
    const obj1 = {
      a: [1, 2, 3]
    };
    const obj2 = {
      a: [4, 5, 6]
    };

    const mergedObj = mergekit({ appendArrays: true })(obj1, obj2);

    expect(mergedObj.a).toHaveLength(6); // Expecting all values to be included
    expect(mergedObj.a).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe('onlyObjectWithKeyValues', () => {
  test('onlyObjectWithKeyValues', () => {
    const objs = [
      { action: 'read', domain: 'movies', id: '123' },
      {
        action: 'read',
        resource: { director: ['Christopher Nolan'] },
        domain: 'movies',
        id: '345'
      },
      {
        action: 'read',
        resource: { director: ['Quentin Tarantino'] },
        domain: 'movies',
        id: '7890'
      },
      {
        action: 'write',
        resource: { director: ['James Cameron'] },
        domain: 'movies',
        id: '9999'
      }
    ];

    const mergedObj = mergekit({
      dedupArrays: true,
      appendArrays: true,
      onlyObjectWithKeyValues: [
        { key: 'domain', value: 'movies' },
        { key: 'action', value: 'read' }
      ]
    })(...objs);

    expect(mergedObj.id).not.toBe('9999');
    expect(mergedObj.action).toBe('read');
    expect(mergedObj.domain).toBe('movies');
    expect(mergedObj.resource.director).toEqual([
      'Christopher Nolan',
      'Quentin Tarantino'
    ]);
  });
});
