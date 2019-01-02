# `ss.js`

## Usage

Install Node 10.x or later, then in this directory run `npm i --production`.

For a new spreadsheet, run `npm run ss`.

To open a CSV (useful as a shortcut for testing), run `npm run ss ../test.csv`.
Note that you must have implemented the `set` function in order for this to
work. Check out the CSVs in `../examples/` directory for some possibly useful
test files.

## Extension

The spreadsheet class you should extend lives in `ss/engine.js`.

## For interviewers (not candidates)

Dev setup:

```
npm i
```

Running tests:

```
npm run test
```
