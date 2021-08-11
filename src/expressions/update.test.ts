import type { UpdateInput } from '../dynoexpr';
import {
  getExpressionAttributes,
  getUpdateExpression,
  parseOperationValue,
  isMathExpression,
} from './update';

describe('update expression', () => {
  it.each(['foo + 2', 'foo - 2', '2 - foo', '2 + foo', 'foo  +  2', 'foo+2'])(
    'parses the number on a math operation update: %s',
    (expr) => {
      expect.assertions(1);
      const expected = 2;
      const result = parseOperationValue(expr, 'foo');
      expect(result).toBe(expected);
    }
  );

  it('converts from an obj to ExpressionAttributes', () => {
    expect.assertions(1);
    const Update = {
      foo: 'bar',
      baz: 2,
      'foo-bar': 'buz',
      fooBar: 'buzz',
      'foo.bar': 'quz',
      foo_bar: 'qiz',
      FooBaz: null,
    };
    const params = { Update };
    const result = getExpressionAttributes(params);

    const expected = {
      Update,
      ExpressionAttributeNames: {
        '#na4d8': 'foo',
        '#n51f2': 'bar',
        '#n6e88': 'baz',
        '#n9cb1': 'foo-bar',
        '#n5dc0': 'fooBar',
        '#n5a6e': 'foo_bar',
        '#nf26a': 'FooBaz',
      },
      ExpressionAttributeValues: {
        ':v51f2': 'bar',
        ':v862c': 2,
        ':v66e7': 'buz',
        ':vfef0': 'buzz',
        ':v11cd': 'quz',
        ':vf0bd': null,
        ':vc4ab': 'qiz',
      },
    };
    expect(result).toStrictEqual(expected);
  });

  it('builds ExpressionAttributesMap with existing maps', () => {
    expect.assertions(1);
    const Update = { a: 1 };
    const params = {
      Update,
      ExpressionAttributeNames: { '#b': 'b' },
      ExpressionAttributeValues: { ':b': 2 },
    };
    const result = getExpressionAttributes(params);

    const expected = {
      Update,
      ExpressionAttributeNames: { '#b': 'b', '#n2661': 'a' },
      ExpressionAttributeValues: { ':b': 2, ':v849b': 1 },
    };
    expect(result).toStrictEqual(expected);
  });

  it('updates attributes - SET', () => {
    expect.assertions(1);
    const params = {
      Update: {
        foo: 'bar',
        baz: 2,
        buz: { biz: 3 },
        'foo.bar': 4,
        'foo.bar.baz': 'buz',
        'foo.baz': null,
      },
    };
    const result = getUpdateExpression(params);

    const expected = {
      UpdateExpression:
        'SET #na4d8 = :v51f2, #n6e88 = :v862c, #n66e7 = :v2362, #na4d8.#n51f2 = :v122c, #na4d8.#n51f2.#n6e88 = :v66e7, #na4d8.#n6e88 = :vf0bd',
      ExpressionAttributeNames: {
        '#na4d8': 'foo',
        '#n51f2': 'bar',
        '#n6e88': 'baz',
        '#n66e7': 'buz',
      },
      ExpressionAttributeValues: {
        ':v51f2': 'bar',
        ':v862c': 2,
        ':v2362': { biz: 3 },
        ':v122c': 4,
        ':v66e7': 'buz',
        ':vf0bd': null,
      },
    };
    expect(result).toStrictEqual(expected);
  });

  it.each([
    ['foo', 'foo - 2', true],
    ['foo', 'foo-2', true],
    ['foo', '10-20-001', false],
    ['foo', 'foobar - 2', false],
    ['foo', '2-foobar', false],
    ['foo', 'foo - bar', false],
    ['foo', 'Mon Jun 01 2020 20:54:50 GMT+0100 (British Summer Time)', false],
    ['foo', 'foo+bar@baz-buz.com', false],
    ['foo', 'http://baz-buz.com', false],
    ['foo', null, false],
  ])(
    'identifies an expression as being a math expression',
    (expr1, expr2, expected) => {
      expect.assertions(1);
      const result = isMathExpression(expr1, expr2);
      expect(result).toStrictEqual(expected);
    }
  );

  it('updates numeric value math operations - SET', () => {
    expect.assertions(1);
    const params: UpdateInput = {
      Update: {
        foo: 'foo - 2',
        bar: '2 - bar',
        baz: 'baz + 9',
      },
    };
    const result = getUpdateExpression(params);

    const expected = {
      UpdateExpression:
        'SET #na4d8 = #na4d8 - :v862c, #n51f2 = :v862c - #n51f2, #n6e88 = #n6e88 + :vad26',
      ExpressionAttributeNames: {
        '#na4d8': 'foo',
        '#n51f2': 'bar',
        '#n6e88': 'baz',
      },
      ExpressionAttributeValues: {
        ':v862c': 2,
        ':vad26': 9,
      },
    };
    expect(result).toStrictEqual(expected);
  });

  it("updates expression with -/+ but it's not a math expression", () => {
    expect.assertions(1);
    const params: UpdateInput = {
      Update: {
        foo: '10-20-001',
        bar: '2020-06-01T19:53:52.457Z',
        baz: 'Mon Jun 01 2020 20:54:50 GMT+0100 (British Summer Time)',
        buz: 'foo+bar@baz-buz.com',
      },
    };
    const result = getUpdateExpression(params);

    const expected = {
      UpdateExpression:
        'SET #na4d8 = :vc40c, #n51f2 = :v4416, #n6e88 = :vdeb4, #n66e7 = :v14ee',
      ExpressionAttributeNames: {
        '#na4d8': 'foo',
        '#n51f2': 'bar',
        '#n6e88': 'baz',
        '#n66e7': 'buz',
      },
      ExpressionAttributeValues: {
        ':vc40c': '10-20-001',
        ':v4416': '2020-06-01T19:53:52.457Z',
        ':vdeb4': 'Mon Jun 01 2020 20:54:50 GMT+0100 (British Summer Time)',
        ':v14ee': 'foo+bar@baz-buz.com',
      },
    };
    expect(result).toStrictEqual(expected);
  });

  it('adds a number - ADD', () => {
    expect.assertions(1);
    const params: UpdateInput = {
      UpdateAction: 'ADD',
      Update: {
        foo: 5,
      },
    };
    const result = getUpdateExpression(params);

    const expected = {
      UpdateExpression: 'ADD #na4d8 :v18d5',
      ExpressionAttributeNames: {
        '#na4d8': 'foo',
      },
      ExpressionAttributeValues: {
        ':v18d5': 5,
      },
    };
    expect(result).toStrictEqual(expected);
  });

  it('adds elements to a set - SET', () => {
    expect.assertions(1);
    const params: UpdateInput = {
      UpdateAction: 'ADD',
      Update: {
        foo: [1, 2],
        bar: ['bar', 'baz'],
      },
    };
    const result = getUpdateExpression(params);
    const expected = {
      UpdateExpression: 'ADD #na4d8 :vd26b, #n51f2 :v9ad1',
      ExpressionAttributeNames: {
        '#n51f2': 'bar',
        '#na4d8': 'foo',
      },
      ExpressionAttributeValues: {
        ':v9ad1': new Set(['bar', 'baz']),
        ':vd26b': new Set([1, 2]),
      },
    };
    expect(result).toStrictEqual(expected);
  });

  it('removes element from a set - DELETE', () => {
    expect.assertions(1);
    const params: UpdateInput = {
      UpdateAction: 'DELETE',
      Update: {
        foo: [1, 2],
        bar: ['bar', 'baz'],
      },
    };
    const result = getUpdateExpression(params);

    const expected = {
      UpdateExpression: 'DELETE #na4d8 :vd26b, #n51f2 :v9ad1',
      ExpressionAttributeNames: {
        '#n51f2': 'bar',
        '#na4d8': 'foo',
      },
      ExpressionAttributeValues: {
        ':v9ad1': new Set(['bar', 'baz']),
        ':vd26b': new Set([1, 2]),
      },
    };
    expect(result).toStrictEqual(expected);
  });
});
