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

module.exports = {
  Index
};
