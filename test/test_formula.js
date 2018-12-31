let {tokenize, parse} = require('../ss/formula.js');
let assert = require('assert');

describe('parse', () => {
    let EXAMPLES = [
        ['A1', 'A1'],
        ['A1 + A2', ['+', 'A1', 'A2']],
        ['2018-01-01', '2018-01-01'],
        ['"string"', 'string'],
        ['function((1+1))', ['function', ['+', '1', '1']]],
        ['a + b(c + d)', ['+', 'a', ['b', ['+', 'c', 'd']]]],
        ['a * b(c)', ['*', 'a', ['b', 'c']]],
    ]
    for (let [code, tree] of EXAMPLES) {
        it(`parses "${code}"`, () => {
            assert.deepEqual(parse(code), tree);
        })
    }
})
