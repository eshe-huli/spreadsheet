/** Spreadsheet engine. */
class Spreadsheet {
  /** Get the evaluated and formatted value at the given cell index.
   *
   * @param {models.Index} index cell to evaluate
   *
   * @returns {String} the cell value, evaluated (if a formula) and formatted
   * according to the format set with `setFormat`.
   */
  getFormatted(index) {
    return this.getRaw(index); // no eval/format for now
  }
  /** Get the raw text that the user entered into the given cell.
   *
   * @param {models.Index} index the cell to fetch
   * @returns {String} the `raw` most recently set with `set`.
   */
  getRaw(index) {
    return index.label; // fake data
  }
  /** Set the value at the given cell.
   *
   * @param {models.Index} index the cell to set
   * @param {String} raw the value of the cell
   */
  set(index, raw) {
    throw Error(`set ${index.label} = ${raw}`);
  }
  /** Set the format string for a given cell.
   *
   * @param {models.Index} index the cell to format
   * @param {String} type the type of format--'default', 'number' or
   * 'datetime'
   * @param {(null|Intl.NumberFormat|Intl.DateTimeFormat)} spec an instance of
   *     the appropriate type of formatter to use on the cell.
   */
  setFormat(index, type, spec) {
    let specStr =
      spec && spec.resolvedOptions && JSON.stringify(spec.resolvedOptions());
    throw Error(`setFormat ${index.label} ${type} ${specStr}`);
  }
}

module.exports = { Spreadsheet };
