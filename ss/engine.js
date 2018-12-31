class Spreadsheet {
    /** Get the evaluated and formatted value at the given cell index.
     *
     * @param {Index} index cell to evaluate
     *
     * @returns {String} the cell value, evaluated (if a formula) and formatted
     * according to the format set with `set_format`.
     */
    getFormatted(index) {
        return index.label;
    }
    /** Get the raw text that the user entered into the given cell.
     *
     * @param {Index} index the cell to fetch
     * @returns {String} the `raw` most recently set with set(ref, raw).
     */
    getRaw(index) {
        return `="${index.label}"`;
    }
    /** Set the value at the given cell.
     *
     * @param {Index} index the cell to set
     * @param {String} raw the value of the cell
     */
    set(index, raw) {
        throw Error(`set ${index.label} = ${raw}`);
    }
    /** Set the format string for a given index.
     *
     * @param {Index} index the cell to format
     * @param {String} type the type of format--'default', 'number' or
     * 'datetime'
     * @param {String} spec the format string to use on the cell:
     *      if `type` is 'default', should be None
     *      if `type` is 'number', a string suitable for passing to
     *          `str.format`
     *      if `type` is 'datetime', a string suitable for passing to
     *          `datetime.strftime`
     */
    setFormat(index, type, spec) {
        throw Error(`setFormat ${index.label} ${type} ${spec}`);
    }
    /**
     *
     * @param {Range} src the range to copy
     * @param {Range} dest the cell into which the upper-left of `src` should go
     */
    copy(src, dest) {
        throw Error(`copy ${src.label} ${dest.label}`)
    }
    /**
     *
     * @param {Range} range the range to sort.
     * @param {Number} column the integer index of the column to sort. Must lie
     * between range.first.col and range.last.col (inclusive).
     * @param {Boolean} ascending whether to sort in ascending (1, 2, 3) or
     * descending (3, 2, 1) order.
     */
    sort(range, column, ascending) {
        throw Error(`sort ${range.label} ${column} ${ascending}`)
    }
}

module.exports = { Spreadsheet };
