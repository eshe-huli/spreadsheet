class Spreadsheet:
    def get_formatted(self, ref):
        """Get the evaluated and formatted value at the given cell ref.

        Arguments:
            ref: a string referring to a cell, like 'A1' or 'ZZ503'

        Returns: the cell value, evaluated (if a formula) and formatted
            according to the format set with `set_format`.
        """
        return self.get_raw(ref)  # no evaluation/formatting for now
    def get_raw(self, ref):
        """Get the raw text that the user entered into the given cell.

        Arguments:
            ref: a string referring to a cell, like 'A1' or 'ZZ503'

        Returns: the `raw` most recently set with set(ref, raw).
        """
        return ref
    def set(self, ref, raw):
        """Set the value at the given cell.

        Arguments:
            ref: a string referring to a cell, like 'A1' or 'ZZ503'
            raw: the raw string, like '1' or '2018-01-01' or '=A2+A3'
        """
        raise NotImplementedError(f"set {ref} = {raw!r}")
    def set_format(self, range, type, spec):
        """Set the format string for a given range.

        Arguments:
            range: the range to format, in range notation (e.g. 'A1:B2')
            type: the type of format--'default', 'number' or 'datetime'
            spec: the format string to use on the cell:
                if `type` is 'default', should be None
                if `type` is 'number', a string suitable for passing to
                    `str.format`
                if `type` is 'datetime', a string suitable for passing to
                    `datetime.strftime`
        """
        raise NotImplementedError(f"set_format {range} {type} {spec}")
    def copy(self, src, dest):
        """Copy the cell range `src` to `dest`.

        Arguments:
            src: the range to copy in range notation (e.g. 'A1:B2')
            dest: the cell into which the upper-left of `src` should go
        """
        raise NotImplementedError(f"copy {src} {dest}")
    def sort(self, range, column, ascending):
        """Sort the given range by the given column.

        Arguments:
            src: the range to copy in range notation (e.g. 'A1:B2')
            dest: the cell into which the upper-left of `src` should go
        """
        raise NotImplementedError(f"sort {range} {column}")
