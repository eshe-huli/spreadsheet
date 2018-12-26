"""Support classes for working with a spreadsheet:

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
        match = INDEX_RE.match(label)
        if match is None:
            raise ValueError(f"{label} is not a valid spreadsheet index")
        row = int(match['row']) - 1
        char = match['char']
        num_chars = len(match['col'])
        col = 26 * (num_chars - 1) + ord(char) - ord('A')
        return Index(row=row, col=col)

class _Range(NamedTuple):
    # Private base class for `Range`, which needs to override __new__. See
    # `Range` for docs.
    first: Index
    last: Index

class Range(_Range):
    """Represents a range of cells like 'A1:B3'.

    `first` and `last` are both *inclusive*, contrary to the usual convention.
    This is because:

    1. ranges are normally referred to by inclusive notation ('A1:B2' includes
       column B and row 2)
    2. ranges are normally constructed by referencing the first and last cells
       that should be included (e.g. if the cursor is on row B2 and the
       selection started on A1, then both A1 and B2 should be included in the
       selection range.)

    You may construct a range from indices that are in the "wrong" order, and
    `first` and `last` will be rearranged for you:

    >>> Range(Index(1, 0), Index(0, 1)).first  # (0, 0)
    """
    def __new__(cls, pos1, pos2):
        return super().__new__(
            cls,
            Index(min(pos1.row, pos2.row), min(pos1.col, pos2.col)),
            Index(max(pos1.row, pos2.row), max(pos1.col, pos2.col))
        )
    def contains(self, pos):
        return (
            self.first.col <= pos.col <= self.last.col
            and self.first.row <= pos.row <= self.last.row
        )
    def __str__(self):
        return f"{self.first}:{self.last}"
    @property
    def column_indices(self):
        return range(self.first.col, self.last.col + 1)
    @property
    def row_indices(self):
        return range(self.first.row, self.last.row + 1)
    @classmethod
    def parse(cls, desc):
        """Parse a Range from a string like A1:B3.

        Raises a ValueError if the string is not a valid range.
        """
        try:
            first, last = desc.split(':')
        except ValueError:
            raise ValueError(f"{desc} is not a valid range")
        return Range(Index.parse(first), Index.parse(last))
