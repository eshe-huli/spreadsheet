var blessed = require('blessed');
var views = require('./views.js');
var {Spreadsheet} = require('./engine.js')

// Create a screen object.
var screen = blessed.screen({
  smartCSR: true
});

var engine = new Spreadsheet();

new views.SpreadsheetView(engine, screen);
