"""Support classes for working with a spreadsheet."""

from typing import NamedTuple
import re

__all__ = ["Index"]

INDEX_RE = re.compile(
    r"""
^
(?P<col>(?P<char>[A-Z])(?P=char)*)
(?P<row>[0-9]+)
$
""",
    re.VERBOSE | re.IGNORECASE,
)


class Index(NamedTuple):
    """A spreadsheet index, like ``'A1'`` or ``'ZZZ123'``.

    Immutable. `row` and `col` are both zero-indexed.

    To construct from a string like ``'A1'``, use `Index.parse`.

    To render a user-facing label, call `str` (see `Index.__str__`).
    """

    row: int
    """The row (y-coordinate)"""
    col: int
    """The column (x-coordinate)"""

    def __add__(self, other):
        """Return a new Index summing the `row` and `col` attrs.

        >>> Index(0, 0) + Index(2, 3)
        Index(row=2, col=3)
        >>> Index(0, 0) + (2, 3)
        Index(row=2, col=3)

        Args:
            other (Index)
        Returns:
            Index:
        """
        return self._binop(int.__add__, other)

    def __sub__(self, other):
        """Return a new Index with the difference of the `row` and `col`
        attrs.

        >>> Index(2, 3) - (1, 2)
        Index(row=1, col=1)

        Args:
            other (Index):
        Returns:
            Index:
        """
        return self._binop(int.__sub__, other)

    def min(self, other):
        """Return a new Index with the smaller of each `row` and `col` attr.

        >>> Index(1, 2).min((2, 1))
        Index(row=1, col=1)

        Args:
            other (Index):
        Returns:
            Index:
        """
        return self._binop(min, other)

    def max(self, other):
        """Return a new Index with the greater of each `row` and `col` attr.

        >>> Index(1, 2).max((2, 1))
        Index(row=2, col=2)

        Args:
            other (Index):
        Returns:
            Index:
        """
        return self._binop(max, other)

    def _binop(self, f, other):
        return Index(f(self.row, other[0]), f(self.col, other[1]))

    @property
    def column_label(self):
        """The human readable column label.

        >>> Index(57, 1).column_label
        'B'
        >>> Index(57, 27).column_label
        'BB'
        >>> Index(57, 53).column_label
        'BBB'

        """
        nreps = (self.col // 26) + 1
        char = chr(ord("A") + self.col % 26)
        return nreps * char

    @property
    def row_label(self):
        """The human readable row label.

        >>> Index(1, 1).row_label
        '2'
        """
        return str(self.row + 1)

    def __str__(self):
        """The human readable cell label.

        >>> str(Index(9, 27))
        'BB10'
        """
        return f"{self.column_label}{self.row_label}"

    @classmethod
    def parse(cls, label):
        """Construct an Index from a string like ``'A1'``.

        Case-insensitive.

        Raises ValueError if the index is not valid.

        >>> Index.parse("A1")
        Index(row=0, col=0)
        >>> Index.parse("bb10")
        Index(row=9, col=27)
        """
        match = INDEX_RE.match(label)
        if match is None:
            raise ValueError(f"{label} is not a valid spreadsheet index")
        row = int(match["row"]) - 1
        char = match["char"].upper()
        num_chars = len(match["col"])
        col = 26 * (num_chars - 1) + ord(char) - ord("A")
        return Index(row=row, col=col)
