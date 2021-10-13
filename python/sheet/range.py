from typing import NamedTuple

from sheet.index import Index


class _Range(NamedTuple):
    # Private base class for `Range`, which needs to override __new__. See
    # `Range` for docs.
    first: Index
    last: Index


class Range(_Range):
    """Represents a range of cells like ``'A1:B3'``.

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

    >>> Range(Index(1, 0), Index(0, 1)).first
    Index(row=0, col=0)

    To parse a range from human syntax, use `Range.parse`.

    Args:
        pos1 (Index):
        pos2 (Index):

    Attributes:
        first (Index): The top-left cell of the range.

        last (Index): The bottom-right cell that is still included in the range.

    """

    def __new__(cls, pos1, pos2):
        return super().__new__(
            cls,
            Index(min(pos1.row, pos2.row), min(pos1.col, pos2.col)),
            Index(max(pos1.row, pos2.row), max(pos1.col, pos2.col)),
        )

    def contains(self, pos):
        """Returns true if the range contains the given position.

        >>> Range.parse('B2:C3').contains(Index.parse('C3'))
        True
        >>> Range.parse('B2:C3').contains(Index.parse('C4'))
        False
        >>> Range.parse('B2:C3').contains(Index.parse('D3'))
        False

        Args:
            pos (Index):

        Returns:
            bool:
        """
        return (
            self.first.col <= pos.col <= self.last.col
            and self.first.row <= pos.row <= self.last.row
        )

    def __str__(self):
        """The human readable syntax for the range.

        >>> str(Range(Index.parse('A1'), Index.parse('B2')))
        'A1:B2'
        """
        return f"{self.first}:{self.last}"

    @property
    def height(self):
        """Number of rows contained in the range.

        >>> Range.parse('A1:B3').height
        3

        Returns:
            int:
        """
        return self.last.row - self.first.row + 1

    @property
    def width(self):
        """Number of columns contained in the range.

        >>> Range.parse('A1:B3').width
        2

        Returns:
            int:
        """
        return self.last.col - self.first.col + 1

    def row(self, i):
        """Iterate over the indices of the i-th row.

        >>> [str(i) for i in Range.parse('A1:C3').row(1)]
        ['A2', 'B2', 'C2']
        """
        assert i < self.height
        start = self.first + (i, 0)
        return (start + (0, j) for j in range(self.width))

    @property
    def indices(self):
        """Iterate over all indices in a range.

        >>> [str(i) for i in Range.parse('A1:B3').indices]
        ['A1', 'B1', 'A2', 'B2', 'A3', 'B3']

        Returns:
            Iterator(int):
        """
        for i in range(self.height):
            yield from self.row(i)

    @classmethod
    def parse(cls, desc):
        """Parse a Range from a string like A1:B3.

        Raises a ValueError if the string is not a valid range.

        >>> Range.parse('A1:B3')
        Range(first=Index(row=0, col=0), last=Index(row=2, col=1))
        """
        try:
            first, last = desc.split(":")
        except ValueError:
            raise ValueError(f"{desc} is not a valid range")
        return Range(Index.parse(first), Index.parse(last))
