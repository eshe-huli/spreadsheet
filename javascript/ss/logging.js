const util = require('util');
const fs = require('fs');
const output = fs.createWriteStream(__dirname + '/../spreadsheet.log', {'flags': 'a'});

const logger = new console.Console(output);

const funcs = {
  log: logger.log.bind(logger),
  info: logger.info.bind(logger),
  warn: logger.warn.bind(logger),
  error: logger.error.bind(logger),
  debug: (logger.debug || logger.log).bind(logger)
};

function logprefix(fn) {
  Object.keys(funcs).forEach(function(k) {
    logger[k] = function() {
      const s = typeof fn === 'function' ? fn() : fn;
      arguments[0] = util.format(s, arguments[0]);
      funcs[k].apply(logger, arguments);
    };
  });
}


module.exports = logger;

patch();

function patch(fn) {
  logprefix(fn || timestamp);
}

// This is the date format to prepend:
function timestamp() {
  return '[' + new Date().toISOString() + ']';
}

