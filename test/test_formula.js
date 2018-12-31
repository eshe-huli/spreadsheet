let {tokenize, parse} = require('../ss/formula.js');
let assert = require('assert');

describe('parse', () => {
    for (let [code, tree] of [
        ['A1', 'A1'],
        ['A1 + A2', ['+', 'A1', 'A2']],
        ['2018-01-01', '2018-01-01'],
        ['"string"', 'string'],
        ['function((1+1))', ['function', ['+', '1', '1']]],
        ['a + b(c + d)', ['+', 'a', ['b', ['+', 'c', 'd']]]],
        ['a * b(c)', ['*', 'a', ['b', 'c']]],
    ]) {
        it(`parses "${code}"`, () => {
            assert.deepStrictEqual(parse(code), tree);
        })
    }
    describe('operator precedence', () => {
        for (let [higher, lower] of [
            ['*', '+'],
            ['*', '-'],
            ['/', '+'],
            ['/', '-']
        ]) {
            it(`${higher} binds tighter than ${lower}`, () => {
                assert.deepStrictEqual(
                    parse(`a ${lower} b ${higher} c`),
                    [lower, 'a', [higher, 'b', 'c']]
                );
                assert.deepStrictEqual(
                    parse(`a ${higher} b ${lower} c`),
                    [lower, [higher, 'a', 'b'], 'c']
                );
            });
        }

        for (let [fst, snd] of [
            ['+', '-'],
            ['-', '+'],
            ['*', '/'],
            ['/', '*']
        ]) {
            it(`${fst} binds equally with ${snd}`, () => {
                assert.deepStrictEqual(
                    parse(`a ${fst} b ${snd} c ${fst} d`),
                    [fst, [snd, [fst, 'a', 'b'], 'c'], 'd']
                );
            });
        }
    });

    describe('errors', () => {
        for (let [code, expected] of [
            ['b + a a', "Expected one of: (, *, /, +, -, [end of string]; got 'a'"],
            ['b + a1:b2(foo)', "a1:b2 is not a valid function name"],
            ['b + a +', "Expected one of: a literal value, a quoted string, (; got [end of string]"],
        ]) {
            it(`has correct text for ${code}`, () => {
                assert.throws(() => parse(code), Error, expected);
            });
        }
    });
})
