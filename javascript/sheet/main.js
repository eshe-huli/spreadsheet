#!/usr/bin/env node
const fs = require("fs");

if (require.main === module) {
  const logger = require("./logging.js");
  logger.log("--------------------");
  logger.log("Spreadsheet starting");

  const blessed = require("blessed");
  const views = require("./views.js");
  const models = require("./models.js");
  const { Spreadsheet } = require("./engine.js");

  const program = blessed.program({ buffer: true, tput: true, zero: true });

  process.on("exit", () => {
    program.showCursor();
    program.normalBuffer();
  });
  process.on("uncaughtException", err => {
    logger.log(`Exiting due to uncaught exception: ${err.stack}`);
    console.log(err.stack);
    logger.close(() => {
      process.exit(1);
    });
  });

  const engine = new Spreadsheet();

  if (process.argv.length > 2) {
    const parse = require("csv-parse/lib/sync");
    const fs = require("fs");
    const fname = process.argv[2];
    const data = fs.readFileSync(fname, { encoding: "utf-8" });
    const records = parse(data);
    records.forEach((values, row) => {
      values.forEach((value, col) => {
        engine.set(new models.Index(row, col), records[row][col]);
      });
    });
  }

  program.alternateBuffer();
  program.hideCursor();
  program.csr(0, program.height - 1);
  program.cup(0, 0);
  program.clear();
  new views.SpreadsheetView(engine, program);
}
