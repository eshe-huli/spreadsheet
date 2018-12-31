var blessed = require('blessed');
var {Index, Range} = require('./models.js')

const KEY_DELTAS = {
    left: {row: 0, col: -1},
    right: {row: 0, col: 1},
    up: {row: -1, col: 0},
    down: {row: 1, col: 0}
}

/** TODO
 * - Cell editing
 * - Selection
 * - Menu system
 * - Formatting
 * - Copy/paste
 * - Shortcut display
 * - Framerate counter
 */

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
    constructor(engine, screen) {
        this.engine = engine;
        this.screen = screen;
        this.topLeft = this.cursor = new Index(0, 0);
        this.shortcuts = blessed.box({
            top: 0,
            left: 0,
            width: '100%',
            height: 2,
            content: 'Shortcuts\nbox'
        });
        this.screen.append(this.shortcuts);
        this.input = blessed.textbox({
            top: 2,
            left: 0,
            width: '100%',
            height: 1,
        });
        this.screen.append(this.input);
        this.input.setValue('A value');
        this.input.focus();
        let HEADER_HEIGHT = this.shortcuts.height + this.input.height;
        // footer - message area
        this.footer = blessed.box({
            top: '100%-1',
            left: 0,
            width: '100%',
            height: 1,
            content: 'Welcome to the spreadsheet!'
        });
        this.screen.append(this.footer);
        let FOOTER_HEIGHT = this.footer.height;
        this.grid = blessed.box({
            top: HEADER_HEIGHT,
            left: 0,
            width: '100%',
            height: `100%-${HEADER_HEIGHT+FOOTER_HEIGHT}`,
            tags: true
        });
        this.screen.append(this.grid);
        // key bindings
        this.screen.on('keypress', (ch, key) => this.handleInput(ch, key));
        this.refresh();
    }
    handleInput(ch, key) {
        if (['escape', 'C-c'].includes(key.full)) {
            return process.exit(0);
        }
        if (['left', 'right', 'up', 'down'].includes(key.full)) {
            this.moveCursorBy(KEY_DELTAS[key.full]);
        }
        if (key.full.length == 1) {
            this.input.readInput(() => {
                this.footer.setText(this.input.getValue());
            });
        }
        this.refresh();
    }
    /** Refill self.grid with the currently-visible cells.
     */
    refresh() {
        let rowLabelWidth = this.rowLabelWidth;
        var content = '{inverse}' + ' '.repeat(rowLabelWidth);
        // displayed range
        let range = new Range(
            this.topLeft,
            this.topLeft.add({
                row: this.grid.height - 1,
                col: this.numColumnsDisplayed
            })
        )
        let drawRow = (row, callback) => {
            // Draw a row. Assumes the current line of `content` starts with
            // `rowLabelWidth` characters. `callback` is called with (index,
            // width) and must return a string of length `width`
            var x = rowLabelWidth;
            for (let index of row) {
                let width = Math.min(
                    this.getColumnWidth(index.column),
                    this.grid.width - x - 1
                );
                if (width > 2) {
                    content += callback(index, width);
                }
                x += width;
            }
        }
        // column labels
        drawRow(range.row(0), (ix, width) => {
            return alignCenter(ix.columnLabel, width);
        });
        content += '{/inverse}';
        // rows
        for (var offset = 0; offset < this.grid.height - 1; offset++) {
            content += '\n';
            // row label
            let row = [...range.row(offset)];
            let label = alignRight(row[0].rowLabel, this.rowLabelWidth);
            content += `{inverse}${label}{/inverse}`;
            drawRow(row, (ix, width) => {
                var text = alignRight(this.engine.getFormatted(ix), width);
                if (ix.equals(this.cursor)) {
                    text = `{inverse}${text}{/inverse}`
                }
                return text;
            });
        }
        this.grid.setContent(content);
        this.screen.render();
    }
    // Return the width of the row-label section (including padding).
    get rowLabelWidth() {
        var maxRow = this.topLeft.add(new Index(
            this.grid.height, 0));
        return maxRow.rowLabel.length + 1;
    }
    get numColumnsDisplayed() {
        var w = this.grid.width
        , x = this.rowLabelWidth
        , curColumn = this.topLeft.col;
        while (x < w) {
            x += this.getColumnWidth(curColumn);
            curColumn += 1;
        }
        return curColumn - this.topLeft.col - 1;
    }
    get numRowsDisplayed() {
        return this.grid.height - 1;
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
        this.refresh();
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

module.exports = {
    SpreadsheetView
}
