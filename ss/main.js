var blessed = require('blessed');
var views = require('./views.js');
var {Spreadsheet} = require('./engine.js')

// Create a screen object.
var program = blessed.program();

var engine = new Spreadsheet();

program.alternateBuffer();
program.hideCursor();
program.clear();
process.on('exit', () => {
  program.showCursor();
  program.normalBuffer();
})
new views.SpreadsheetView(engine, program);
