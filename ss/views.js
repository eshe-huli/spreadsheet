/** TODO
 * - Menu system
 * - Formatting
 * - Shortcut display
 * - Framerate counter
 */

var blessed = require('blessed');
var {Index, Range} = require('./models.js')

const KEY_DELTAS = {
    left: {row: 0, col: -1},
    right: {row: 0, col: 1},
    up: {row: -1, col: 0},
    down: {row: 1, col: 0}
}
const attrs = {
    INVERSE: 'inverse',
    BOLD: 'bold',
    UNDERLINE: 'UNDERLINE',
    NORMAL: null
}

const ESCAPE_KEYS = ['escape', 'C-g'];

class Position {
    constructor(y, x) {
        this.y = y;
        this.x = x;
    }

    equals(other) {
        return this.y == other.y && this.x == other.x;
    }
    add(other) {
        return this.binop((a, b) => a + b, other);
    }
    sub(other) {
        return this.binop((a, b) => a - b, other);
    }
    max(other) {
        return this.binop(Math.max, other);
    }
    min(other) {
        return this.binop(Math.min, other);
    }
    /** Apply a binary operator to both `y` and `x`, producing a new Position.
     */
    binop(f, other) {
        return new Position(f(this.y, other.y), f(this.x, other.x));
    }
    toString() {
        return `(${this.y}, ${this.x})`
    }
}

class Rectangle {
    constructor(pos1, pos2) {
        this.topLeft = pos1.min(pos2);
        this.bottomRight = pos1.max(pos2);
    }
    static fromDimensions(pos, dims) {
        return new Rectangle(pos, pos.add(dims));
    }
    static fromSides({top, bottom, left, right}) {
        return new Rectangle(
            new Position(top, left), new Position(bottom, right));
    }
    get width() {
        return this.bottomRight.x - this.topLeft.x;
    }
    get height() {
        return this.bottomRight.y - this.topLeft.y;
    }
    get top() { return this.topLeft.y; }
    get bottom() { return this.bottomRight.y; }
    get left() { return this.topLeft.x; }
    get right() { return this.bottomRight.x; }
    get bottomLeft() { return new Position(this.bottom, this.left); }
    get topRight() { return new Position(this.top, this.right); }
    toString() { return `${this.topLeft} -> ${this.bottomRight}` }
}

class EditBox {
    constructor(text) {
        this.text = text;
        this.cursor = text.length;
    }
    insert(ch) {
        this.text = (
            this.text.slice(0, this.cursor)
            + ch
            + this.text.slice(this.cursor)
        );
        this.cursor += ch.length;
    }
    backspace() {
        this.cursor -= 1;
        this.text =
            this.text.slice(0, this.cursor) + this.text.slice(this.cursor + 1);
    }
    moveCursor(delta) {
        this.cursor = Math.min(
            Math.max(this.cursor + delta, 0), this.text.length);
    }
}

/** Spreadsheet viewer.
 *
 * Architectural notes:
 *
 * - Because this is a port of a Python program that did not have `blessed`
 * available, we kind of ignore all the nice features of `blessed` and just use
 * it as an ncurses replacement. We split the screen up into a few `box`
 * elements but otherwise manage everything ourselves--meaning we listen for
 * every key event from `screen` instead of relying the focus method; we
 * manually draw the table by setting `box.content`; etc.
 */
class SpreadsheetView {
    constructor(engine, program) {
        this.engine = engine;
        this.program = program;
        this.topLeft = this.cursor = new Index(0, 0);
        this.message = 'Welcome to the spreadsheet!'
        this.editBox = null;
        this.menu = null;
        this.selectingFrom = null;
        this.selectingTo = null;
        this.program.on('keypress', (ch, key) => this.handleInput(ch, key));
        this.handleKey = this.handleKeyDefault;
        this.DEFAULT_SHORTCUTS = {
            'return': { name: 'edit', handle: this.editCurrent },
            'C-w': { name: 'copy', handle: this.beginCopy },
            'C-y': { name: 'paste', handle: this.paste },
            'C-c': { name: 'quit', handle: this.quit },
            'C-f': { name: 'format', handle: this.selectFormat },
            'C-s': { name: 'sort', handle: this.sort },
        }
        this.redraw();
    }
    measure() {
        let height = this.program.rows, width = this.program.cols;
        let screen = Rectangle.fromSides({
            top: 0, left: 0, bottom: height, right: width
        })

        // Header
        let shortcuts = Rectangle.fromDimensions(
            screen.topLeft, {y: 2, x: width});
        let editBox = Rectangle.fromDimensions(
            shortcuts.bottomLeft, {y: 1, x: width});
        // Footer
        let message = new Rectangle(
            screen.bottomLeft.sub({y: 1, x: 0}),
            screen.bottomRight,
        );
        // Grid
        let gridAndLabels = new Rectangle(
            editBox.bottomRight, message.topLeft);
        let maxRow = this.topLeft.add({y: gridAndLabels.height - 1, x: 0});
        let rowLabelWidth = maxRow.rowLabel.length + 1;
        let rowLabels = Rectangle.fromDimensions(
            gridAndLabels.topLeft, {y: gridAndLabels.height, x: rowLabelWidth});
        let grid = new Rectangle(
            rowLabels.topRight, gridAndLabels.bottomRight);
        this.layout = {
            grid, rowLabels, message, editBox, shortcuts
        };
    }
    handleInput(ch, key) {
        this.message = '';
        this.handleKey(ch, key);
        this.redraw();
    }
    handleKeyDefault(ch, key) {
        if (['escape', 'C-c'].includes(key.full)) {
            return process.exit(0);
        }
        else if (['left', 'right', 'up', 'down'].includes(key.full)) {
            this.moveCursorBy(KEY_DELTAS[key.full]);
        }
        else if (isCharacter(key)) {
            this.beginEditing('');
            this.handleKeyEdit(key);
        }
        else if (key.full == 'C-`') {
            this.beginSelecting();
        }
        else if (ESCAPE_KEYS.includes(key.full)) {
            this.finishSelecting();
        }
        else if (key.full in this.DEFAULT_SHORTCUTS) {
            this.DEFAULT_SHORTCUTS[key.full].handle.apply(this);
        }
        else {
            this.message = `Unknown key ${key.full}`;
        }
    }
    editCurrent() {
        let value = this.engine.getRaw(this.cursor);
        this.beginEditing(value);
    }
    beginCopy() {
        this.selectingFrom = this.selectingFrom || this.cursor;
        this.selectingTo = this.cursor;
    }
    paste() {
        if (this.selectingTo == null) {
            this.message = 'Copy a cell or range with C-w first';
            return;
        }
        this.engine.copy(this.selection, this.cursor);
        this.finishSelecting();
    }
    //// Selection
    beginSelecting() {
        this.selectingFrom = this.cursor;
    }
    finishSelecting() {
        this.selectingFrom = null;
        this.selectingTo = null;
    }
    get selection() {
        return new Range(
            this.selectingFrom || this.cursor,
            this.selectingTo || this.cursor
        );
    }
    //// Editing
    beginEditing(text) {
        this.editBox = new EditBox(text);
        this.handleKey = this.handleKeyEdit;
    }
    finishEditing(commit) {
        if (commit) {
            this.engine.set(this.cursor, this.editBox.text);
        }
        this.editBox = null;
        this.handleKey = this.handleKeyDefault;
    }
    handleKeyEdit(ch, key) {
        let FINISH_KEYS = {
            return: {y: 1, x: 0},
            tab: {x: 1, y: 0}
        }
        let MOVEMENT_KEYS = {
            left: -1, right: 1
        }
        let ABORT_KEYS = ['up', 'down'];
        let BACKSPACE_KEYS = ['backspace', 'C-h'];
        if (key.full in FINISH_KEYS) {
            this.finishEditing(true);
            this.moveCursorBy(FINISH_KEYS[key.full]);
        }
        else if (isCharacter(key)) {
            this.editBox.insert(getCharacter(key));
        }
        else if (BACKSPACE_KEYS.includes(key.full)) {
            this.editBox.backspace();
        }
        else if (key.full in MOVEMENT_KEYS) {
            this.editBox.moveCursor(MOVEMENT_KEYS[key.full])
        }
        else if (ESCAPE_KEYS.includes(key.full)) {
            this.finishEditing(false);
        }
        else if (ABORT_KEYS.includes(key.full)) {
            this.finishEditing(false);
            this.handleKeyDefault(ch, key);
        }
        else {
            this.message = `Unknown key ${key.full}`;
        }
    }
    /** Refill self.grid with the currently-visible cells.
     */
    redraw() {
        this.measure();
        this.draw();
    }
    write(pos, str, attr) {
        if (pos != null) {
            this.program.setx(pos.x);
            this.program.sety(pos.y);
        }
        this.program._write(this.program.text(str, attr));
    }
    draw() {
        this.program.clear();
        let grid = this.layout.grid;
        let nRows = this.numRowsDisplayed;
        var x = 0, topLeft = this.topLeft;
        while (x < grid.width) {
            this.drawColumn(
                new Range(topLeft, topLeft.add({row: nRows - 1, col: 0})),
                grid.topLeft.add({y: 0, x: x})
            );
            x += this.getColumnWidth(topLeft.col);
            topLeft = topLeft.add({col: 1, row: 0});
        }
        this.drawRowLabels();
        this.drawMessage();
        this.drawEditor()
        this.program.flush();
        /*
        self.draw_framerate()
        self.draw_shortcuts()
        let rowLabelWidth = this.rowLabelWidth;
        var content = '{inverse}' + ' '.repeat(rowLabelWidth);
        */
    }
    drawRowLabels() {
        let rect = this.layout.rowLabels;
        this.write(rect.topLeft, ' '.repeat(rect.width), attrs.INVERSE);
        for (var i = 0; i < this.numRowsDisplayed; i++) {
            let label = alignRight(
                this.topLeft.add({row: i, col: 0}).rowLabel, rect.width)
            this.write(rect.topLeft.add({x: 0, y: i+1}), label, attrs.INVERSE);
        }
    }
    drawColumn(range, pos) {
        // header
        let col = range.first.col;
        let width = Math.min(
            this.getColumnWidth(col),
            this.layout.grid.bottomRight.x - pos.x
        );
        if (width < 3) {
            // just finish the column header
            this.write(pos, ' '.repeat(width), attrs.INVERSE);
            return;
        }
        let label = ' ' + alignCenter(range.first.columnLabel, width - 1);
        this.write(pos, label, attrs.INVERSE);
        // draw the values
        [...range.indices].map((index, dy) => {
            let value = this.engine.getFormatted(index);
            let text = ' ' + alignRight(value, width - 1);
            var attr = attrs.NORMAL;
            if (this.selectingFrom == null) {
                // TODO(ben) selection attrs
                if (this.cursor.equals(index)) {
                    attr = attrs.INVERSE;
                }
            } else {
                let isSelected = this.selection.contains(index)
                , isCursor = this.cursor.equals(index);
                if (isSelected || isCursor) {
                    if (isSelected && isCursor) {
                        // For some reason 'gray fg' makes the bg gray :(
                        attr = [attrs.INVERSE, attrs.BOLD, 'gray fg'];
                    } else {
                        attr = attrs.INVERSE;
                    }
                }
            }
            this.write(pos.add({y: dy+1, x: 0}), text, attr);
        })
        /*
        if self.selecting_from is None:
            if self.cursor == index:
                attr = curses.A_REVERSE
        else:
            if self.selection.contains(index):
                attr = curses.A_REVERSE
            if index == self.cursor:
                attr = curses.A_REVERSE | curses.A_BOLD | curses.A_UNDERLINE
        */
    }
    drawMessage() {
        let label = alignCenter(this.message, this.layout.message.width);
        this.write(this.layout.message.topLeft, label);
    }
    drawShortcuts() {

    }
    drawEditor() {
        if (this.editBox == null) {
            this.program.hideCursor();
        } else {
            this.write(this.layout.editBox.topLeft, this.editBox.text);
            this.program.setx(this.layout.editBox.left + this.editBox.cursor);
            this.program.showCursor();
        }
    }
    // Return the width of the row-label section (including padding).
    get rowLabelWidth() {
        return this.layout.rowLabels.width;
    }
    get numColumnsDisplayed() {
        var w = this.layout.grid.width
        , x = 0
        , curColumn = this.topLeft.col;
        while (x < w) {
            x += this.getColumnWidth(curColumn);
            curColumn += 1;
        }
        return curColumn - this.topLeft.col - 1;
    }
    get numRowsDisplayed() {
        return this.layout.rowLabels.height - 1;
    }
    getColumnWidth(column) {
        return 9;
    }
    moveCursorBy(delta) {
        this.cursor = this.cursor.add(delta).max({row: 0, col: 0});
        // Ensure cursor is visibnle: top left can't be greater than the
        // cursor...
        this.topLeft = this.topLeft.min(this.cursor);
        // or less than the cursor minus the displayed region.
        this.topLeft = this.topLeft.max(this.cursor.sub({
            row: this.numRowsDisplayed - 1,
            col: this.numColumnsDisplayed - 2 // minus 2 bc last col is partial
        }));
        this.redraw();
    }
}

function alignRight(str, width) {
    if (str.length > width) {
        return str.slice(0, width - 2) + '..';
    }
    return ' '.repeat(width - str.length) + str;
}

function alignCenter(str, width) {
    if (str.length > width) {
        return str.slice(0, width - 2) + '..';
    }
    var padding = width - str.length
    , pLeft = Math.floor(padding / 2)
    , pRight = padding - pLeft;
    return ' '.repeat(pLeft) + str + ' '.repeat(pRight);
}

const CHARACTERS = {
    space: ' '
}
function getCharacter(key) {
    if (key.full.length == 1) return key.full;
    return CHARACTERS[key.full];
}
function isCharacter(key) {
    return getCharacter(key) != null;
}

module.exports = {
    SpreadsheetView
}
