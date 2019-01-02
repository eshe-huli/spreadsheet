## Usage

Install Node 10.x or later, then in this directory run `npm i --production`.

For a new spreadsheet, run `npm run ss`.

To load a CSV file (useful as a shortcut for testing), run `npm run ss
../examples/1-basic.csv`. Note that you must have implemented the `set` and
`getRaw` functions in order for this to do anything useful. Check out the other
CSVs in `../examples/` directory for some possibly useful test files.

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
