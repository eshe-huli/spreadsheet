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
        return self.get_raw(index)  # no eval/format for now

    def get_raw(self, index):
        """Get the raw text that the user entered into the given cell.

        Arguments:
            index (Index): the cell to fetch

        Returns:
            str: the `raw` most recently set with `set`.
        """
        return str(index)  # fake data

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
            type (str): the type of format--``'default'``, ``'number'`` or ``'date'``
            spec (str): the format string to use on the cell:

                - if `type` is ``'default'``, should be None
                - if `type` is ``'number'``, a string suitable for passing to
                  python's string % operator, e.g. ``'%.2f'``
                - if `type` is ``'date'``, a string suitable for passing to
                  `datetime.strftime`, e.g. ``'%Y-%m-%d'``
        """
        raise NotImplementedError(f"set_format {index} {type} {spec}")