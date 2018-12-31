var blessed = require('blessed');
var {Index, Range} = require('./models.js')

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
        this.screen.key(['escape', 'q', 'C-c'], function(ch, key) {
            return process.exit(0);
        });
        this.refresh();
        this.screen.render();
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
                return alignRight(this.engine.getFormatted(ix), width);
            });
        }
        this.grid.setContent(content);
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
    getColumnWidth(column) {
        return 9;
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
