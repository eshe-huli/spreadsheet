#!/usr/bin/env node
if (require.main === module) {

  const blessed = require('blessed');
  const views = require('./views.js');
  const models = require('./models.js');
  const {Spreadsheet} = require('./engine.js');

  const program = blessed.program({buffer: true, tput: true, zero: true});
  const engine = new Spreadsheet();

  if (process.argv.length > 2) {
    const parse = require('csv-parse/lib/sync');
    const fs = require('fs');
    const fname = process.argv[2];
    const data = fs.readFileSync(fname, {encoding: 'utf-8'});
    const records = parse(data);
    records.forEach((values, row) => {
      values.forEach((value, col) => {
        console.log(row, col);
        engine.set(new models.Index(row, col), records[row][col]);
      });
    });
    process.exit(0);
  }

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
