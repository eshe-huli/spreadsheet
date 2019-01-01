if (require.main === module) {

  var blessed = require('blessed');
  var views = require('./views.js');
  var {Spreadsheet} = require('./engine.js')

  // Create a screen object.
  var program = blessed.program({buffer: true, tput: true, zero: true});

  var engine = new Spreadsheet();

  program.alternateBuffer();
  program.hideCursor();
  program.csr(0, program.height - 1);
  program.cup(0, 0);
  program.clear();
  process.on('exit', () => {
    program.showCursor();
    program.normalBuffer();
  })
  new views.SpreadsheetView(engine, program);
}
