const INDEX_RE = new RegExp(
  "^" + "(?<col>(?<char>[A-Z])\\k<char>*)" + "(?<row>[0-9]+)" + "$",
  "i"
);

const A_CHAR_CODE = "A".charCodeAt(0);

/**
 * The argument passed was not valid for some reason.
 */
class ValueError extends Error {
  constructor(message) {
    super(message);
    this.name = "ValueError";
  }
}
/**
 * A spreadsheet index, like 'A1' or 'ZZZ123'.
 *
 * Immutable. `row` and `col` are both zero-indexed.
 *
 * To construct from a string like 'A1', use `Index.parse`.
 *
 * To render a user-facing label, use the `label` property.
 *
 */
class Index {
  /**
   * Constructor.
   *
   * @param {number} row
   * @param {number} col
   */
  constructor(row, col) {
    /** The row (y-coordinate) */
    this.row = row;
    /** The column (x-coordinate) */
    this.col = col;
    Object.freeze(this);
  }

  /**
   * Return true if `row` and `col` are equal to those of `other`.
   *
   * @param {models.Index} other
   *
   * @example
   * new Index(0, 0).equals(new Index(0, 0)) // => true
   * new Index(0, 0).equals({row: 0, col: 0, ignored: 0}) // => true
   * new Index(1, 0).equals(new Index(0, 0)) // => false
   * new Index(0, 1).equals(new Index(0, 0)) // => false
   */
  equals(other) {
    return this.row == other.row && this.col == other.col;
  }
  /**
   * Return a new Index with the sum of the rows/columns.
   *
   * @param {models.Index} other
   * @return {models.Index}
   *
   * @example
   * new Index(1, 2).add({row: 3, col: 4}) // => new Index(4, 6)
   */
  add(other) {
    return this._binop((a, b) => a + b, other);
  }
  /**
   * Return a new Index with the difference of the rows/columns.
   *
   * @param {models.Index} other
   * @return {models.Index}
   *
   * @example
   * new Index(1, 2).sub({row: 1, col: 2}) // => new Index(0, 0)
   */
  sub(other) {
    return this._binop((a, b) => a - b, other);
  }
  /**
   * Return a new Index with the greater of each row/column.
   *
   * @param {models.Index} other
   * @return {models.Index}
   *
   * @example
   * new Index(1, 2).max(new Index(2, 1)) // => new Index(2, 2)
   */
  max(other) {
    return this._binop(Math.max, other);
  }
  /**
   * Return a new Index with the smaller of each row/column.
   *
   * @param {models.Index} other
   * @return {models.Index}
   *
   * @example
   * new Index(1, 2).min(new Index(2, 1)) // => new Index(1, 1)
   */
  min(other) {
    return this._binop(Math.min, other);
  }
  /**
   * The human readable column label.
   *
   * @return {string}
   *
   * @example
   * new Index(57, 1).columnLabel // => 'B'
   * new Index(57, 27).columnLabel // => 'BB'
   * new Index(57, 53).columnLabel // => 'BBB'
   */
  get columnLabel() {
    const nreps = Math.floor(this.col / 26) + 1;
    const char = String.fromCharCode(A_CHAR_CODE + (this.col % 26));
    return char.repeat(nreps);
  }

  /**
   * The human readable row label.
   *
   * @return {string}
   *
   * @example
   * new Index(1, 1).rowLabel // => '2'
   */
  get rowLabel() {
    return (this.row + 1).toString();
  }

  /**
   * The human readable row/column label.
   *
   * @return {string}
   *
   * @example
   * new Index(0, 0).label // => 'A1'
   * new Index(9, 27).label // => 'BB10'
   */
  get label() {
    return `${this.columnLabel}${this.rowLabel}`;
  }

  /**
   * Construct an Index from a string like 'A1'.
   *
   * Case-insensitive.
   *
   * @param {string} label
   * @return {models.Index}
   * @throws {models.ValueError} if the string is not a valid index.
   *
   * @example
   * Index.parse("A1") // => new Index(0, 0)
   * Index.parse("bb10") // => new Index(9, 27)
   */
  static parse(label) {
    INDEX_RE.lastIndex = 0;
    const match = INDEX_RE.exec(label);
    if (match == null) {
      throw new ValueError(label + " is not a valid index");
    }
    const row = Number.parseInt(match.groups.row) - 1;
    const charCode = match.groups.char.toUpperCase().charCodeAt(0);
    const numChars = match.groups.col.length;
    const col = charCode - A_CHAR_CODE + 26 * (numChars - 1);
    return new Index(row, col);
  }

  // Apply a binary operator to both `row` and `col`, producing a new Index.
  _binop(f, other) {
    return new Index(f(this.row, other.row), f(this.col, other.col));
  }
}

/**
 * Represents a range of cells like 'A1:B3'.
 *
 * `first` and `last` are both *inclusive*, contrary to the usual convention.
 * This is because:
 *
 * 1. ranges are normally referred to by inclusive notation ('A1:B2' includes
 *    column B and row 2)
 * 2. ranges are normally constructed by referencing the first and last cells
 *    that should be included (e.g. if the cursor is on row B2 and the
 *    selection started on A1, then both A1 and B2 should be included in the
 *    selection range.)
 */
class Range {
  /**
   * Construct a range.
   * You may construct a range from indices that are in the "wrong" order,
   * and `first` and `last` will be rearranged for you:
   *
   * @param {models.Index} pos1
   * @param {models.Index} pos2
   *
   * @example
   * new Range(new Index(1, 0), new Index(0, 1)).first
   * // => new Index(0, 0)
   */
  constructor(pos1, pos2) {
    this.first = pos1.min(pos2);
    this.last = pos1.max(pos2);
  }
  /**
   * Returns true if the range contains the given position.
   *
   * @param {models.Index} pos
   * @return {boolean}
   *
   * @example
   * Range.parse('B2:C3').contains(Index.parse('C3')) // => true
   * Range.parse('B2:C3').contains(Index.parse('C4')) // => false
   * Range.parse('B2:C3').contains(Index.parse('D3')) // => false
   */
  contains(pos) {
    return (
      this.first.row <= pos.row &&
      pos.row <= this.last.row &&
      this.first.col <= pos.col &&
      pos.col <= this.last.col
    );
  }
  /**
   * Human readable description of the range, like `'A1:B3'`.
   *
   * @return {string}
   *
   * @example
   * new Range(Index.parse('A1'), Index.parse('B2')).label
   * // => "A1:B2"
   */
  get label() {
    return `${this.first.label}:${this.last.label}`;
  }
  /**
   * Number of rows contained in the range.
   *
   * @return {number}
   *
   * @example
   * Range.parse('A1:B3').height // => 3
   */
  get height() {
    return this.last.row - this.first.row + 1;
  }
  /**
   * Number of columns contained in the range.
   *
   * @return {number}
   *
   * @example
   * Range.parse('A1:B3').width // => 2
   */
  get width() {
    return this.last.col - this.first.col + 1;
  }
  /**
   * Iterator over the indices of the i-th row.
   *
   * @return {Generator}
   *
   * @example
   * [...Range.parse('A1:C4').row(1)].map(it => it.label)
   * // => ['A2', 'B2', 'C2']
   */
  *row(i) {
    if (i >= this.height) {
      throw new ValueError("Require i < " + this.height);
    }
    const start = this.first.add(new Index(i, 0));
    for (let j = 0; j < this.width; j++) {
      yield start.add(new Index(0, j));
    }
  }

  /**
   * Iterator over all indices in a range.
   *
   * @return {Generator}
   *
   * @example
   * [...Range.parse('A1:B3').indices].map(it => it.label)
   * // => ['A1', 'B1', 'A2', 'B2', 'A3', 'B3']
   */
  get indices() {
    return function*() {
      for (let i = 0; i < this.height; i++) {
        const row = this.row(i);
        for (const ix of row) {
          yield ix;
        }
      }
    }.apply(this);
  }
  /**
   * Parse a Range from a string like A1:B3.
   *
   * @throws {models.ValueError} if the string is not a valid range.
   *
   * @example
   * Range.parse('A1:B3').label // => 'A1:B3'
   */
  static parse(text) {
    const split = text.split(":");
    if (split.length != 2) {
      throw ValueError(text + " is not a valid range");
    }
    const [first, last] = split;
    return new Range(Index.parse(first), Index.parse(last));
  }
}

module.exports = {
  Index,
  Range
};
