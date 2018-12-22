import curses
from typing import NamedTuple

# TODO
# - row numbers
# - column letters
# - value editing
# - range highlighting
# - formatting selection
# - copy
# - sort

def _ref(col, row):
    nreps = (col // 26) + 1
    char = chr(ord('A') + col % 26)
    return nreps * char + str(row + 1)

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

class Viewer:
    def __init__(self, spreadsheet, stdscr):
        self.spreadsheet = spreadsheet
        self.top_left = Position(0, 0)
        self.cursor = Position(0, 0)
        self.range = None
        self.stdscr = stdscr
        self.message = 'Welcome to the spreadsheet!'
    def draw(self):
        height, width = self.stdscr.getmaxyx()
        nrows = self.get_window_height()
        x = 0
        col = self.top_left.col
        row_top = self.top_left.row
        while x < width:
            delta = self.draw_column(col, row_top, row_top + nrows, 0, x)
            col += 1
            x += delta
        self.draw_message(nrows + 1, width)
    def get_width(self, col):
        return 15
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
        width = self.get_width(col) # TODO dynamic width?
        values = [
            self.spreadsheet.get_formatted(_ref(col, row))
            for row in range(row_top, row_bottom)
        ]
        for dy, value in enumerate(values):
            if len(value) > width:
                value = value[:width-2] + '..'
            row = row_top + dy
            attr = 0 if self.cursor != Position(row, col) else curses.A_REVERSE
            self.stdscr.addstr(y + dy, x, ' ' + value, attr)
        return width + 2
    def draw_message(self, y, width):
        padding = (width - len(self.message)) // 2
        if padding < 1:
            self.message = self.message[:width-4] + '..'
            padding = 1
        self.stdscr.addstr(y, 0, ' ' * padding + self.message)
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
            self.draw()
            self.message = ''
            try:
                action = self.stdscr.getch()
            except KeyboardInterrupt:
                break # quit
            self.handle_key(action)
