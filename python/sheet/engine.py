__all__ = ["Spreadsheet"]

from .models import Index
from .cell import Cell


class Spreadsheet:
    """The spreadsheet engine. This is your job to implement!
    
    These functions are called by the spreadsheet UI.  Each time a value or 
    format is changed, `get_formatted` will be called for every cell in the 
    spreadsheet in sequence.
    """

    def __init__(self):
        # Initialize the spreadsheet engine.
        self.cells = {}
        pass

    def get_formatted(self, index, visited_cells=None):
        """Get the evaluated and formatted value at the given cell ref.

        Arguments:
            index (Index): the cell to evaluate
            visited_cells (Cells): The cells already visited

        Returns:
            str: the cell value, evaluated (if a formula) and formatted
            according to the format set with `set_format`.
        """
        cell = self.cells.get(index, Cell())
        return cell.get_formatted_data(self, visited_cells)

    def get_raw(self, index):
        """Get the raw text that the user entered into the given cell.

        Arguments:
            index (Index): the cell to fetch

        Returns:
            str: the `raw` most recently set with `set`.
        """
        # get the cell object
        cell = self.cells.get(index, Cell())
        return cell.get_raw_data()

    def set(self, index, raw):
        """Set the value at the given cell.

        Arguments:
            index (Index): the cell to update
            raw (str): the raw string, like ``'1'`` or ``'2018-01-01'`` or ``'=A2'``
        """
        cell = self.cells.get(index, Cell())
        cell.set_data(raw)
        self.cells[index] = cell

    def set_format(self, index, type, spec):
        """Set the format string for a given cell.

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
        cell = self.cells.get(index, Cell())
        cell.set_format(type, spec)
        self.cells[index] = cell
