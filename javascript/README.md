## Usage

Install Node 10.x or later, then in this directory run `npm i --production`.

(Note that during installation of the dependencies, `python` must invoke 
python2 currently, so make sure you are outside any python3 virtualenv and 
have python2 installed!)

For a new spreadsheet, run `npm run ss`.

To load a CSV file (useful as a shortcut for testing), run `npm run ss
../examples/1-basic.csv`. Note that you must have implemented the `set` and
`getRaw` functions in order for this to do anything useful. Check out the other
CSVs in `../examples/` directory for some possibly useful test files.

## Extension

The spreadsheet class you should extend lives in `ss/engine.js`.

## For interviewers (not candidates)

Dev setup:

(outside Python virtualenv)
```
npm i
```

Running tests:

```
npm run test
```
