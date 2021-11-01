let models = require("../sheet/models.js");
let assert = require("assert");

describe("index", () => {
  for (let [row, col, label] of [
       [0, 0, 'A1'],
       [0, 1, 'B1'],
       [1, 0, 'A2'],
       [123, 28, 'CC124']
  ]) {
    it('Knows its label', () => {
      index = new models.Index(row, col)
      assert.equal(index.label, label)
    });

    it('Parses correctly', () => {
      index = models.Index.parse(label)
      assert.equal(index.row, row)
      assert.equal(index.col, col)
    });
  }
});
