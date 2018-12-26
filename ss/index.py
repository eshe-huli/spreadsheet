"""Support classes for working with spreadsheet indices.

`Index` - a class representing a spreadsheet index (e.g. 'A1').
`Range` - a class representing a contiguous range of indices (e.g. 'A1:B2')
"""

from typing import NamedTuple
import re

INDEX_RE = re.compile(r"""
^
(?P<col>(?P<char>[A-Z])(?P=char)*)
(?P<row>[0-9]+)
$
""", re.VERBOSE | re.IGNORECASE)

class Index(NamedTuple):
    """A spreadsheet index, like 'A1' or 'ZZZ123'.

    Immutable. `row` and `col` are both zero-indexed.

    To construct from a string like 'A1', use `Index.parse`:
        Index.parse("A1")  # Index(0, 0)

    To render a user-facing label, call `str`:
        str(Index.parse("A1"))  # "A1"

    To move an index, add another index, or a tuple:
        str(Index.parse("A1") + (2, 3))  # "D3"
    """
    row: int
    col: int
    def __add__(self, other):
        (row, col) = other
        return Index(
            row=self.row + row,
            col=self.col + col
        )
    @property
    def column_label(self):
        nreps = (self.col // 26) + 1
        char = chr(ord('A') + self.col % 26)
        return nreps * char
    @property
    def row_label(self):
        return str(self.row + 1)
    def __str__(self):
        return f"{self.column_label}{self.row_label}"
    @classmethod
    def parse(cls, label):
        """Construct an Index from a string like 'A1'.

        Case-insensitive.

        Raises ValueError if the index is not valid.
        """
        match = INDEX_RE.match
        if match is None:
            raise ValueError(f"{label} is not a valid spreadsheet index")
        row = int(match['row']) - 1
        char = match['char']
        num_chars = len(match['col'])
        col = 26 * (num_chars - 1) + ord(char) - ord('A')
        return Index(row=row, col=col)
