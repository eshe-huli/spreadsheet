var blessed = require('blessed');
var views = require('./views.js');

// Create a screen object.
var screen = blessed.screen({
  smartCSR: true
});

new views.SpreadsheetView(null, screen);
