__all__ = ["Spreadsheet"]


class Spreadsheet:
    """The spreadsheet engine. This is your job to implement!"""

    def get_formatted(self, index):
        """Get the evaluated and formatted value at the given cell ref.

        Arguments:
            index (Index): the cell to evaluate

        Returns:
            str: the cell value, evaluated (if a formula) and formatted
            according to the format set with `set_format`.
        """
        return str(index)  # no evaluation/formatting for now

    def get_raw(self, index):
        """Get the raw text that the user entered into the given cell.

        Arguments:
            index (Index): the cell to fetch

        Returns:
            str: the `raw` most recently set with `set`.
        """
        return f"={str(index)!r}"

    def set(self, index, raw):
        """Set the value at the given cell.

        Arguments:
            index (Index): the cell to update
            raw (str): the raw string, like ``'1'`` or ``'2018-01-01'`` or ``'=A2+A3'``
        """
        raise NotImplementedError(f"set {index} = {raw!r}")

    def set_format(self, index, type, spec):
        """Set the format string for a given range.

        Arguments:
            index (Index): the cell to format
            type (str): the type of format--``'default'``, ``'number'`` or ``'datetime'``
            spec (str): the format string to use on the cell:

                - if `type` is ``'default'``, should be None
                - if `type` is ``'number'``, a string suitable for passing to
                  `str.format`
                - if `type` is ``'datetime'``, a string suitable for passing to
                  `datetime.strftime`
        """
        raise NotImplementedError(f"set_format {index} {type} {spec}")

    def copy(self, src, dest):
        """Copy the cell range `src` to `dest`.

        Arguments:
            src (Range): the range to copy
            dest (Index): the cell into which the upper-left of `src` should go
        """
        raise NotImplementedError(f"copy {src} {dest}")

    def sort(self, range, column, ascending):
        """Sort the given range by the given column.

        Arguments:
            range (Range): the range to sort.
            column (int): the integer index of the column to sort. Must lie
                between range.first.col and range.last.col (inclusive).
            ascending (bool): whether to sort in ascending (1, 2, 3) or
                descending (3, 2, 1) order.
        """
        raise NotImplementedError(f"sort {range} {column} {ascending}")
