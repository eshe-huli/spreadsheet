var blessed = require('blessed');

class SpreadsheetView {
    constructor(engine, screen) {
        this.engine = engine;
        this.screen = screen;
        this.shortcuts = blessed.box({
            top: 0,
            left: 0,
            width: '100%',
            height: 2,
            content: 'Shortcuts box'
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
        this.screen.key(['escape', 'q', 'C-c'], function(ch, key) {
            return process.exit(0);
        });
        this.screen.render();
    }
}

module.exports = {
    SpreadsheetView
}
