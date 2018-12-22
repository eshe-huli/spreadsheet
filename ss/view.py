import curses
from typing import NamedTuple

# TODO
# - value editing
# - range highlighting
# - formatting selection
# - copy
# - sort

def _ref(col, row):
    return _get_column_label(col) + _get_row_label(row)

def _get_column_label(col):
    nreps = (col // 26) + 1
    char = chr(ord('A') + col % 26)
    return nreps * char

def _get_row_label(row):
    return str(row + 1)

class Position(NamedTuple):
    row: int
    col: int
    def __add__(self, other):
        return Position(
            self.row + other.row,
            self.col + other.col
        )

class Range(NamedTuple):
    top_left: Position
    bottom_right: Position

ARROW_KEYS = {
    curses.KEY_UP: Position(-1, 0),
    curses.KEY_DOWN: Position(1, 0),
    curses.KEY_LEFT: Position(0, -1),
    curses.KEY_RIGHT: Position(0, 1),
}

class ScreenPosition(NamedTuple):
    y: int
    x: int

class Rectangle(NamedTuple):
    top_left: ScreenPosition
    bottom_right: ScreenPosition
    @property
    def width(self):
        return self.bottom_right.x - self.top_left.x
    @property
    def height(self):
        return self.bottom_right.y - self.top_left.y
    @classmethod
    def fromhw(cls, y, x, h, w):
        return Rectangle(
            ScreenPosition(y, x),
            ScreenPosition(y + h, x + w)
        )

class Layout(NamedTuple):
    grid: Rectangle
    message: Rectangle
    row_labels: Rectangle
    column_labels: Rectangle
    edit_box: Rectangle

class Viewer:
    def __init__(self, spreadsheet, stdscr):
        self.spreadsheet = spreadsheet
        self.top_left = Position(0, 0)
        self.cursor = Position(0, 0)
        self.range = None
        self.stdscr = stdscr
        self.message = 'Welcome to the spreadsheet!'
        self.layout = None
    def measure(self):
        height, width = self.stdscr.getmaxyx()
        # Lay out the top section
        topy = 0
        edit_box = Rectangle.fromhw(topy, 0, 1, width)
        topy += edit_box.height
        # Lay out the bottom section
        bottomy = height - 1
        message = Rectangle.fromhw(bottomy, 1, 1, width - 2)
        bottomy -= message.height - 1

        # spreadsheet grid. first figure out the width of the row labels
        HEADER_HEIGHT = 1
        nrows = bottomy - topy - HEADER_HEIGHT
        max_row = self.top_left.row + nrows
        row_label_width = len(str(max_row)) + 1
        row_labels = Rectangle.fromhw(
            topy + HEADER_HEIGHT, 0, nrows, row_label_width
        )
        column_labels = Rectangle(
            ScreenPosition(topy, row_labels.bottom_right.x),
            ScreenPosition(topy + HEADER_HEIGHT, width)
        )
        grid = Rectangle(
            ScreenPosition(topy + HEADER_HEIGHT, row_labels.bottom_right.x),
            ScreenPosition(bottomy, width)
        )
        self.layout = Layout(
            grid=grid,
            message=message,
            row_labels=row_labels,
            column_labels=column_labels,
            edit_box=edit_box
        )
    def draw(self):
        grid = self.layout.grid
        nrows = grid.height
        x = grid.top_left.x
        col = self.top_left.col
        row_top = self.top_left.row
        while x < grid.width:
            self.draw_column(
                col=col,
                row_top=row_top,
                row_bottom=row_top + nrows,
                y=grid.top_left.y,
                x=x
            )
            col += 1
            x += self.get_width(col)
        self.draw_row_labels()
        self.draw_column_labels()
        self.draw_message()
    def draw_row_labels(self):
        nrows = self.layout.grid.height
        (y, x) = self.layout.row_labels.top_left
        row_nums = range(self.top_left.row, self.top_left.row + nrows)
        for i, row_num in enumerate(row_nums):
            label = _align_right(
                _get_row_label(row_num), self.layout.row_labels.width
            )
            self.stdscr.addstr(y + i, x, label, curses.A_REVERSE)
    def draw_column_labels(self):
        rect = self.layout.column_labels
        (y, x) = rect.top_left
        col = self.top_left.col
        while x < rect.bottom_right.x:
            width = min(
                self.get_width(col),
                rect.bottom_right.x - x
            )
            label = _align_center(
                _get_column_label(col), width
            )
            self.stdscr.addstr(y, x, label, curses.A_REVERSE)
            x += width
            col += 1
    def get_width(self, col):
        return 9
    def get_window_height(self):
        # 1 row for message, 2 for padding
        return self.stdscr.getmaxyx()[0] - 3
    def get_window_width(self):
        return self.stdscr.getmaxyx()[1]
    def get_cols_displayed(self):
        """Get the # of columns COMPLETELY displayed."""
        w = self.get_window_width()
        n = 0
        while w > 0:
            w -= self.get_width(self.top_left.col + n)
            n += 1
        return n - 1  # last one was only partially displayed
    def draw_column(self, col, row_top, row_bottom, y, x):
        # TODO highlight selected cell
        width = min(
            self.get_width(col),
            self.layout.grid.bottom_right.x - x
        )
        if width < 2:
            # give up on drawing anything
            return
        values = [
            self.spreadsheet.get_formatted(_ref(col, row))
            for row in range(row_top, row_bottom)
        ]
        for dy, value in enumerate(values):
            text = _align_right(value, width)
            row = row_top + dy
            attr = 0 if self.cursor != Position(row, col) else curses.A_REVERSE
            self.stdscr.addstr(y + dy, x, text, attr)
    def draw_message(self):
        rect = self.layout.message
        text = _align_center(self.message, rect.width)
        self.stdscr.addstr(*rect.top_left, text)
    def handle_key(self, action):
        n = curses.keyname(action).decode()
        if action in ARROW_KEYS:
            self.move_cursor(ARROW_KEYS[action])
        else:
            self.message = f"Unknown shortcut {n}"
    def move_cursor(self, delta):
        new_cursor = self.cursor + delta
        if new_cursor.col < 0:
            new_cursor = new_cursor._replace(col=0)
        if new_cursor.row < 0:
            new_cursor = new_cursor._replace(row=0)
        new_top_left = self.top_left
        if new_top_left.col > new_cursor.col:
            new_top_left = new_top_left._replace(col=new_cursor.col)
        if new_top_left.row > new_cursor.row:
            new_top_left = new_top_left._replace(row=new_cursor.row)
        min_col = new_cursor.col - self.get_cols_displayed() + 1
        if min_col > new_top_left.col:
            new_top_left = new_top_left._replace(col=min_col)
        min_row = new_cursor.row - self.get_window_height() + 1
        if min_row > new_top_left.row:
            new_top_left = new_top_left._replace(row=min_row)
        self.cursor = new_cursor
        self.top_left = new_top_left
    def loop(self):
        while True:
            self.stdscr.erase()
            self.measure()
            self.draw()
            self.message = ''
            try:
                action = self.stdscr.getch()
            except KeyboardInterrupt:
                break # quit
            self.handle_key(action)

def _align_right(s, width):
    if len(s) > width:
        s = s[:width-2] + '..'
    return ' ' * (width - len(s)) + s

def _align_center(s, width):
    lpadding = (width - len(s)) // 2
    if lpadding < 0:
        s = s[:width-2] + '..'
        lpadding = 0
    rpadding = width - len(s) - lpadding
    return ' ' * lpadding + s + ' ' * rpadding
