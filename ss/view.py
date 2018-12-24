import curses
from typing import NamedTuple, Callable
import time

# TODO
# - quotes in formula
# - clean up position-manipulation code
# - View tests?

def _ref(row, col):
    return _get_column_label(col) + _get_row_label(row)

def _get_column_label(col):
    nreps = (col // 26) + 1
    char = chr(ord('A') + col % 26)
    return nreps * char

def _get_row_label(row):
    return str(row + 1)

class Position(NamedTuple):
    """A position in grid space.

    Row and column are both zero-indexed."""
    row: int
    col: int
    def __add__(self, other):
        return Position(
            self.row + other.row,
            self.col + other.col
        )
    def ref(self):
        return _ref(*self)

# Map [arrow key] -> [delta to apply to cursor in grid space]
ARROW_KEYS = {
    curses.KEY_UP: Position(-1, 0),
    curses.KEY_DOWN: Position(1, 0),
    curses.KEY_LEFT: Position(0, -1),
    curses.KEY_RIGHT: Position(0, 1),
}
ENTER_KEYS = {curses.KEY_ENTER, 10, 13}
BACKSPACE_KEYS = {curses.KEY_BACKSPACE}
ESCAPE_KEYNAMES = {"^G", "^["}
KEYNAME_BEGIN_SELECTING = "^@"
KEYNAME_BEGIN_COPY = "^W"
KEYNAME_PASTE = "^Y"
KEYNAME_QUIT = "^C"
KEYNAME_FORMATTING = "^F"
KEYNAME_SORT = "^S"

class ScreenPosition(NamedTuple):
    y: int
    x: int
    def __floordiv__(self, dividend):
        return ScreenPosition(self.y // dividend, self.x // dividend)
    def __add__(self, other):
        return ScreenPosition(self.y + other.y, self.x + other.x)

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
    @property
    def center(self):
        return (self.top_left + self.bottom_right) // 2

class Range(NamedTuple):
    top_left: Position
    bottom_right: Position
    @classmethod
    def from_denormalized_inclusive(cls, pos1, pos2):
        return Range(
            Position(min(pos1.row, pos2.row), min(pos1.col, pos2.col)),
            Position(max(pos1.row, pos2.row) + 1, max(pos1.col, pos2.col) + 1)
        )
    def contains(self, pos):
        return (
            self.top_left.col <= pos.col < self.bottom_right.col
            and self.top_left.row <= pos.row < self.bottom_right.row
        )
    def ref(self):
        last = self.bottom_right + Position(-1, -1)
        return f"{self.top_left.ref()}:{last.ref()}"
    @property
    def column_indices(self):
        return range(self.top_left.col, self.bottom_right.col)
    @property
    def row_indices(self):
        return range(self.top_left.row, self.bottom_right.row)

class Layout(NamedTuple):
    grid: Rectangle
    message: Rectangle
    framerate: Rectangle
    row_labels: Rectangle
    column_labels: Rectangle
    edit_box: Rectangle
    shortcuts: Rectangle

class EditBox(NamedTuple):
    text: str
    cursor: int
    def insert(self, char):
        return EditBox(
            text=self.text[:self.cursor] + char + self.text[self.cursor:],
            cursor=self.cursor + 1
        )
    def backspace(self):
        return EditBox(
            text=self.text[:self.cursor-1] + self.text[self.cursor:],
            cursor=self.cursor - 1
        )
    def right(self):
        return self._replace(cursor=min(len(self.text), self.cursor + 1))
    def left(self):
        return self._replace(cursor=max(0, self.cursor - 1))

class Menu(NamedTuple):
    title: str
    # List of tuples (keyname, description, value)
    choices: list
    on_selected: Callable  # called with the 'value' as an argument

class Viewer:
    def __init__(self, spreadsheet, stdscr):
        # Save the current visibility state of the cursor (either 1 or 2); we
        # hide the cursor most of the time, but make it visible while editing
        # cell values.
        self.initial_cursor_visibility = curses.curs_set(0)
        # curses screen that we will write to
        self.stdscr = stdscr
        # A cache of layout information; will be set in `self.measure`
        self.layout = None
        # the instance of models.Spreadsheet that we are viewing
        self.spreadsheet = spreadsheet
        # the top-left visible cell.
        self.top_left = Position(0, 0)
        # the cell that our cursor is currently on.
        self.cursor = Position(0, 0)

        # Highlighting controls to allow the user to select a rectangular
        # range of cells.
        # - When we start highlighting a range, `selecting_from` is the cell
        #   we started highlighting on. The highlighted range is from
        #   `selecting_from` to `cursor`, inclusive.
        # - When the user starts a copy operation, we need to remember what
        #   was selected at that point, so we save the cursor position in
        #   `selecting_to`.
        self.selecting_from = None
        self.selecting_to = None

        # A message to display on the bottom row. Cleared every frame.
        self.message = 'Welcome to the spreadsheet!'
        # The state of the formula editor, or None if we are not editing now.
        self.edit_box = None
        # The function that will be called to handle the next key press.
        # Expected to take a single parameter `key` which is the return value
        # of `getch` or a similar call.
        self.key_handler = self.handle_key_default
        # If True, we will quit at the end of this iteration of the main loop.
        self.quit = False

        # Menu to display, if any
        self.menu = None
        self.formatting_menu = Menu('Formatting', [
            ('^O', 'default', ('default', None)),
            ('^I', '1', ('number', '%d')),
            ('^I', '1.23', ('number', '%0.2f')),
            ('^S', '$1.23', ('number', '$%0.2f')),
            ('^D', '2018-01-01', ('date', '%Y-%m-%d')),
            ('^T', '2018-01-01 13:34:45', ('date', '%Y-%m-%d %H:%M:%S')),
            ('^T', '2018-01-01 13:34:45', ('date', '%Y-%m-%d %H:%M:%S')),
        ], on_selected=self.select_formatting)
        # Framerate indicator
        self.last_frame_time = 0.0

    @property
    def selection(self):
        return Range.from_denormalized_inclusive(
            self.selecting_from or self.cursor,
            self.selecting_to or self.cursor
        )

    def measure(self):
        """Recompute `self.layout` based on current screen dimensions and
        navigation position."""
        height, width = self.stdscr.getmaxyx()
        # Lay out the top section
        topy = 0
        shortcuts = Rectangle.fromhw(topy, 0, 2, width)
        topy += shortcuts.height
        edit_box = Rectangle.fromhw(topy, 0, 1, width)
        topy += edit_box.height
        # Lay out the bottom section
        bottomy = height - 1
        FRAMERATE_WIDTH = 5
        framerate = Rectangle.fromhw(
            bottomy, width - FRAMERATE_WIDTH - 1, 1, FRAMERATE_WIDTH
        )
        message = Rectangle.fromhw(bottomy, 1, 1, width - framerate.width - 2)
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
            framerate=framerate,
            row_labels=row_labels,
            column_labels=column_labels,
            edit_box=edit_box,
            shortcuts=shortcuts
        )

    def draw(self):
        """Draw the entire view to `self.stdscr`."""
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
        self.draw_upper_left_corner()
        self.draw_message()
        self.draw_framerate()
        self.draw_shortcuts()
        self.draw_editor()
    def draw_row_labels(self):
        """Draw the numerical labels of the currently displayed rows."""
        nrows = self.layout.grid.height
        (y, x) = self.layout.row_labels.top_left
        row_nums = range(self.top_left.row, self.top_left.row + nrows)
        for i, row_num in enumerate(row_nums):
            label = _align_right(
                _get_row_label(row_num), self.layout.row_labels.width
            )
            self.stdscr.addstr(y + i, x, label, curses.A_REVERSE)
    def draw_column_labels(self):
        """Draw the letters to label the currently displayed columns."""
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
    def draw_upper_left_corner(self):
        self.stdscr.addstr(
            self.layout.column_labels.top_left.y,
            self.layout.row_labels.top_left.x,
            ' ' * self.layout.row_labels.width,
            curses.A_REVERSE
        )
    def get_width(self, col):
        """Returns the display width of the given column."""
        return 9
    def get_cols_displayed(self):
        """Get the # of columns that are completely visible on the screen."""
        w = self.layout.grid.width
        n = 0
        while w > 0:
            w -= self.get_width(self.top_left.col + n)
            n += 1
        return n - 1  # last one was only partially displayed
    def get_rows_displayed(self):
        """Returns the # of rows that are visible on the screen."""
        return self.layout.grid.height
    def draw_column(self, col, row_top, row_bottom, y, x):
        """Draw the given section of the spreadsheet.

        Draws in a rectangle from (y, x) to
            (y + row_bottom - row_top, x + self.get_width(col))

        Arguments:
            col: the column to draw.
            row_top: the first row to draw
            row_bottom: the last row to draw (exclusive).
            y: the screen y-position to start drawing.
        """
        # TODO highlight selected cell
        width = min(
            self.get_width(col),
            self.layout.grid.bottom_right.x - x
        )
        if width < 2:
            # give up on drawing anything
            return
        values = [
            self.spreadsheet.get_formatted(_ref(row, col))
            for row in range(row_top, row_bottom)
        ]
        for dy, value in enumerate(values):
            text = _align_right(value, width)
            row = row_top + dy
            curpos = Position(row, col)
            attr = 0
            if self.selecting_from is None:
                if self.cursor == curpos:
                    attr = curses.A_REVERSE
            else:
                if self.selection.contains(curpos):
                    attr = curses.A_REVERSE
                if curpos == self.cursor:
                    attr = curses.A_REVERSE | curses.A_BOLD | curses.A_UNDERLINE
            self.stdscr.addstr(y + dy, x, text, attr)
    def draw_message(self):
        rect = self.layout.message
        text = _align_center(self.message, rect.width)
        self.stdscr.addstr(*rect.top_left, text)
    def draw_framerate(self):
        rect = self.layout.framerate
        text = _align_right('%.2f' % self.last_frame_time, rect.width)
        self.stdscr.addstr(*rect.top_left, text)
    def draw_editor(self):
        """Draws the cell value editor.

        Make sure to call this function last, as it controls cursor display."""
        rect = self.layout.edit_box
        if self.edit_box is None:
            curses.curs_set(0)
            formatted = self.spreadsheet.get_formatted(self.cursor.ref())
            self.stdscr.addstr(*rect.top_left, formatted)
        else:
            curses.curs_set(self.initial_cursor_visibility)
            self.stdscr.addstr(*rect.top_left, self.edit_box.text)
            self.stdscr.move(
                rect.top_left.y, rect.top_left.x + self.edit_box.cursor
            )
    def draw_shortcuts(self):
        """Draws the shortcut display window."""
        rect = self.layout.shortcuts
        self.stdscr.move(*rect.top_left)
        self.stdscr.addstr('   ')
        def shortcut(key, description):
            self.stdscr.addstr(key, curses.A_REVERSE)
            self.stdscr.addstr(' ' + description + ' ')
        if self.edit_box is not None:
            shortcut('<enter>', 'set')
            shortcut('^G', 'cancel')
            return
        if self.menu is not None:
            self.stdscr.addstr(self.menu.title + '> ')
            for (key, desc, _) in self.menu.choices:
                shortcut(key, desc)
            shortcut('^G', 'cancel')
            return
        shortcut('<enter>', 'edit')
        shortcut('<bksp>', 'clear')
        shortcut('^[space]', 'select')
        shortcut(KEYNAME_FORMATTING, 'format')
        shortcut(KEYNAME_BEGIN_COPY, 'copy')
        shortcut(KEYNAME_PASTE, 'paste')
        shortcut(KEYNAME_SORT, 'sort')
        shortcut(KEYNAME_QUIT, 'exit')
        if self.selecting_from:
            shortcut('^G', 'cancel')

    def handle_key_default(self, action):
        """Key dispatcher for when no cell is currently being edited."""
        name = curses.keyname(action).decode()
        if name == KEYNAME_QUIT:
            self.quit = True
        elif action in ARROW_KEYS:
            self.move_cursor(ARROW_KEYS[action])
        elif action in ENTER_KEYS:
            value = self.spreadsheet.get_raw(self.cursor.ref())
            self.begin_editing(value)
        elif key_begins_edit(action):
            self.begin_editing('')
            self.handle_key_edit(action)
        elif name == KEYNAME_BEGIN_SELECTING:
            self.begin_selecting()
        elif name == KEYNAME_BEGIN_COPY:
            self.begin_copy()
        elif name == KEYNAME_PASTE:
            self.paste()
        elif name in ESCAPE_KEYNAMES:
            self.finish_selecting()
        elif name == KEYNAME_FORMATTING:
            self.enter_menu(self.formatting_menu)
        elif name == KEYNAME_SORT:
            self.enter_sort_menu()
        elif action in BACKSPACE_KEYS:
            for col in self.selection.column_indices:
                for row in self.selection.row_indices:
                    self.spreadsheet.set(Position(row, col).ref(), '')
        else:
            self.message = f"Unknown shortcut {name}"
    def begin_editing(self, initial_text):
        """Start editing the value of the cell."""
        self.finish_selecting()
        self.edit_box = EditBox(
            text=initial_text,
            cursor=len(initial_text)
        )
        self.key_handler = self.handle_key_edit
    def finish_editing(self, commit):
        """Return from editing mode to navigation mode.

        If `commit` is true, sets the cell value to whatever is in the text
        box; otherwise, discards the text box value."""
        if commit:
            self.spreadsheet.set(self.cursor.ref(), self.edit_box.text)
        self.edit_box = None
        self.key_handler = self.handle_key_default
    def begin_selecting(self):
        """Enter range-selection mode.

        In this mode, """
        self.selecting_from = self.cursor
    def begin_copy(self):
        """Enter copy mode.

        In this mode, the selection that was highlighted stays highlighted,
        but the cursor is free to move around independently from this
        selection.

        When `paste` is called, the underlying model's `paste` function is
        called. Any non-`paste` action exits copy mode."""
        if self.selecting_from is None:
            self.selecting_from = self.cursor
        self.selecting_to = self.cursor
    def paste(self):
        """Tell the model to paste the copied area, then clear the selection."""
        if self.selecting_to is None:
            self.message = 'To paste, copy a cell/range with ^-W first'
            return
        self.spreadsheet.copy(self.selection.ref(), self.cursor.ref())
        self.finish_selecting()
    def finish_selecting(self):
        """Clears the current selected range."""
        self.selecting_to = None
        self.selecting_from = None
    def handle_key_edit(self, action):
        """Key handler during cell value editing.

        Characters, backspace and left/right affect the current editor state.
        Up/down (and other keys in `should_exit_editing_and_handle`) exit the
        current edit, then handle the key in navigation mode."""
        name = curses.keyname(action).decode()
        if action in ENTER_KEYS:
            self.finish_editing(True)
            self.move_cursor(Position(1, 0))
        elif is_character(action):
            char = get_character(action)
            self.edit_box = self.edit_box.insert(char)
        elif action in BACKSPACE_KEYS:
            self.edit_box = self.edit_box.backspace()
        elif action == curses.KEY_LEFT:
            self.edit_box = self.edit_box.left()
        elif action == curses.KEY_RIGHT:
            self.edit_box = self.edit_box.right()
        elif name in ESCAPE_KEYNAMES:
            self.finish_editing(False)
        elif should_exit_editing_and_handle(action):
            self.finish_editing(False)
            self.handle_key_default(action)
        else:
            self.message = f"Unknown key {action} {name}"
    def move_cursor(self, delta):
        """Move the cell cursor.

        If necessary, update `self.top_left` to ensure that the cell cursor is
        visible."""
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
        min_row = new_cursor.row - self.get_rows_displayed() + 1
        if min_row > new_top_left.row:
            new_top_left = new_top_left._replace(row=min_row)
        self.cursor = new_cursor
        self.top_left = new_top_left
    def handle_key_menu(self, action):
        name = curses.keyname(action).decode()
        value = {key: value for key, _, value in self.menu.choices}.get(name)
        if value is not None:
            self.menu.on_selected(value)
            self.exit_menu()
        elif name in ESCAPE_KEYNAMES:
            self.exit_menu()
        else:
            self.message = f"Unknown shortcut {name}"
    def enter_menu(self, menu):
        self.menu = menu
        self.key_handler = self.handle_key_menu
    def exit_menu(self):
        self.menu = None
        self.key_handler = self.handle_key_default
    def select_formatting(self, format):
        (ftype, spec) = format
        self.spreadsheet.set_format(self.selection.ref(), ftype, spec)
    def enter_sort_menu(self):
        if self.selecting_from is None:
            self.message = 'Select a range first with ^-[space]'
            return
        selection = self.selection
        columns = list(selection.column_indices)
        if len(columns) > 10:
            self.message = 'Cannot sort more than 10 columns'
            return
        choices = [
            (str(i), _get_column_label(col), col)
            for i, col in enumerate(columns)
        ]
        self.enter_menu(Menu(
            f'Sort {self.selection.ref()}',
            choices,
            self.sort_range
        ))
    def sort_range(self, col):
        self.spreadsheet.sort(self.selection.ref(), _get_column_label(col))

    def loop(self):
        """Main loop. Refresh the layout, draw, then interpret a character."""
        now = time.perf_counter()
        while not self.quit:
            self.stdscr.erase()
            self.measure()
            self.draw()
            self.message = ''
            self.last_frame_time = time.perf_counter() - now
            try:
                action = self.stdscr.getch()
            except KeyboardInterrupt:
                break # quit
            now = time.perf_counter()
            self.key_handler(action)

def _align_right(s, width):
    """Returns `s` left-padded to `width` with whitespace.

    If too long, `s` is elided with two periods."""
    if len(s) > width:
        s = s[:width-2] + '..'
    return ' ' * (width - len(s)) + s

def _align_center(s, width):
    """Returns `s` left+right padded to `width` with whitespace.

    If too long, `s` is elided with two periods."""
    lpadding = (width - len(s)) // 2
    if lpadding < 0:
        s = s[:width-2] + '..'
        lpadding = 0
    rpadding = width - len(s) - lpadding
    return ' ' * lpadding + s + ' ' * rpadding

def key_begins_edit(key):
    """Return True if, in navigation mode, `key` should cause us to begin edit
    mode."""
    return is_character(key)

def is_character(key):
    """Return True if `key` is a printable ASCII character."""
    return len(curses.keyname(key)) == 1

def get_character(key):
    """Return the ascii value corresponding to `key`."""
    return curses.keyname(key).decode()

def should_exit_editing_and_handle(key):
    """Return True if, in edit mode, `key` should cause us to exit."""
    return key in {
        curses.KEY_UP,
        curses.KEY_DOWN
    }
