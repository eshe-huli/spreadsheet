## Usage

Run in a python 3.7 virtualenv.

To open a new spreadsheet, run `python -m ss`.

To open a CSV (useful as a shortcut for testing), run `python -m ss test.csv`.
Note that you must have implemented the `set` function in order for this to
work. Check out the CSVs in the `examples/` directory for some possibly useful
test files.

To run tests, install `pytest`, then run `pytest`.

## Extension

The spreadsheet class you should extend lives in `ss/engine.py`.
