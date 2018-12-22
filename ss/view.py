import curses
from typing import NamedTuple

def _ref(col, row):
    nreps = (col // 26) + 1
    char = chr(ord('A') + col % 26)
    return nreps * char + str(row + 1)

class Position(NamedTuple):
    row: int
    col: int

class Viewer:
    def __init__(self, spreadsheet, stdscr):
        self.spreadsheet = spreadsheet
        self.top_left = Position(0, 0)
        self.selected = Position(0, 0)
        self.stdscr = stdscr
        self.message = 'Welcome to the spreadsheet!'
    def draw(self):
        height, width = self.stdscr.getmaxyx()
        nrows = height - 3  # 1 row for message, 2 for padding
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
            self.stdscr.addstr(y + dy, x, ' ' + value)
        return width + 2
    def draw_message(self, y, width):
        padding = (width - len(self.message)) // 2
        if padding < 1:
            self.message = self.message[:width-4] + '..'
            padding = 1
        self.stdscr.addstr(y, 0, ' ' * padding + self.message)
    def handle_key(self, action):
        n = curses.keyname(action).decode()
        if False:
            pass # handle an action
        else:
            self.message = f"Unknown shortcut {n}"
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
