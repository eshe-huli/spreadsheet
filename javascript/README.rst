Setup
-----

Install Node 10.x or later, then in this directory run `npm i --production`.

Usage
-----

For a new spreadsheet, run `npm run ss`.

To load a CSV file (useful as a shortcut for testing), run `npm run ss ../examples/1-basic.csv`. Note that you must have implemented the `set` and `getRaw` functions in order for this to do anything useful. Check out the other CSVs in `../examples/` directory for some possibly useful test files.

Dev tips
--------

The spreadsheet class you should extend lives in `ss/engine.js`.

Normal printing to the console won't work because the UI will be drawn over it. Instead, we provide a simple way to log to a file named `spreadsheet.log`. See `ss/main.js` for a usage example.
