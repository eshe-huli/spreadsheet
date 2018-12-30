var blessed = require('blessed');
var {Index, Range} = require('./models.js')

class SpreadsheetView {
    constructor(engine, screen) {
        this.engine = engine;
        this.screen = screen;
        this.cursor = new Index(0, 0);
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
        /*this.rowLabels = blessed.box({

        })*/
        this.screen.key(['escape', 'q', 'C-c'], function(ch, key) {
            return process.exit(0);
        });
        this.screen.render();
    }
}

module.exports = {
    SpreadsheetView
}
