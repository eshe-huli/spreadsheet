const INDEX_RE = new RegExp(
    '^'
    + '(?<col>(?<char>[A-Z])\k<char>*)'
    + '(?<row>[0-9]+)'
    + '$'
);

const A_CHAR_CODE = 'A'.charCodeAt(0);

/*
A spreadsheet index, like 'A1' or 'ZZZ123'.

    Immutable. `row` and `col` are both zero-indexed.

    To construct from a string like 'A1', use `Index.parse`:
    >>> Index.parse("A1")
    Index(row=0, col=0)

    To render a user-facing label, call `str`:
    >>> str(Index.parse("A1"))
    'A1'

    To move an index, add another index, or a tuple:
    >>> Index(0, 0) + (2, 3)
    Index(row=2, col=3)
    >>> Index(2, 3) - (1, 2)
    Index(row=1, col=1)
 */
class Index {
    constructor(row, col) {
        this.row = row;
        this.col = col;
    }

    add(other) {
        return new Index(this.row + other.row, this.col + other.col);
    }

    sub(other) {
        return new Index(this.row - other.row, this.col - other.col);
    }

    get columnLabel() {
        var nreps = Math.floor(this.col / 26) + 1;
        var char = String.fromCharCode(
            A_CHAR_CODE + (this.col % 26));
        return char.repeat(nreps);
    }

    get rowLabel() {
        return (this.row + 1).toString();
    }

    get label() {
        return this.columnLabel + this.rowLabel;
    }

    /** Construct an Index from a string like 'A1'.
     *
     *  Case-insensitive.
     *
     *  Throws Error if the index is not valid.
     *
     */
    static parse(label) {
        var match = INDEX_RE.exec(label);
        if (match == null) {
            throw new Error(label + " is not a valid index");
        }
        var row = Number.parseInt(match.groups.row) - 1;
        var charCode = match.groups.char.charCodeAt(0);
        var numChars = match.groups.col.length;
        var col = (charCode - A_CHAR_CODE) + 26 * (numChars - 1);
        return new Index(row, col);
    }
}

/** Represents a range of cells like 'A1:B3'.
 *
 *  `first` and `last` are both *inclusive*, contrary to the usual convention.
 *  This is because:
 *
 *  1. ranges are normally referred to by inclusive notation ('A1:B2' includes
 *     column B and row 2)
 *  2. ranges are normally constructed by referencing the first and last cells
 *     that should be included (e.g. if the cursor is on row B2 and the
 *     selection started on A1, then both A1 and B2 should be included in the
 *     selection range.)
 *
 *  You may construct a range from indices that are in the "wrong" order, and
 *  `first` and `last` will be rearranged for you:
 *
 *  >>> Range(Index(1, 0), Index(0, 1)).first
 *  Index(row=0, col=0)
 */
class Range {
    constructor(pos1, pos2) {
        this.first = new Index(
            Math.min(pos1.row, pos2.row),
            Math.min(pos1.col, pos2.col)
        );
        this.last = new Index(
            Math.max(pos1.row, pos2.row),
            Math.max(pos1.col, pos2.col)
        );
    }
    contains(pos) {
        return (
            this.first.row <= pos.row && pos.row <= this.last.row
            && this.first.col <= pos.col && pos.col <= this.last.col
        );
    }
    get label() {
        return this.first.label + ":" + this.last.label;
    }
    get height() {
        return this.last.row - this.first.row + 1;
    }
    get width() {
        return this.last.col - this.first.col + 1;
    }
    /**
     * Iterate over the indices of the i-th row.

        >>> [str(i) for i in Range.parse('A1:C3').row(1)]
        ['A2', 'B2', 'C2']
     */
    *row(i) {
        if (i >= this.height) { throw Error("Require i < " + this.height); }
        var start = this.first.add(new Index(i, 0));
        for (var j = 0; j < this.width; j++) {
            yield start.add(new Index(0, j));
        }
    }
    /**
     * Iterate over all indices in a range.
        >>> [str(i) for i in Range.parse('A1:B3').indices]
        ['A1', 'B1', 'A2', 'B2', 'A3', 'B3']
     */
    get indices() {
        return (function* () {
            for (var i = 0; i < this.height; i++) {
                var row = this.row(i);
                for (let ix of row) {
                    yield ix;
                }
            }
        })()
    }
    /**
     * Parse a Range from a string like A1:B3.

        Raises a ValueError if the string is not a valid range.
     */
    static parse(text) {
        let split = text.split(':');
        if (split.length != 2) {
            throw Error(text + " is not a valid range");
        }
        var [first, last] = split;
        return new Range(Index.parse(first), Index.parse(last));
    }
}

module.exports = {
    Index, Range
};
