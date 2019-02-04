Setup
-----

Run in a python 3.7 virtualenv. There are no dependencies.

Usage
-----

To open a new spreadsheet, run `python -m ss` from this directory.

To open a CSV file (useful as a shortcut for testing), run `python -m ss ../examples/1-basic.csv`. Note that you must have implemented the `set` and `get_raw` functions in order for this to do anything useful. Check out the other CSVs in the `../examples/` directory for some possibly useful test files.

Dev tips
--------

The spreadsheet class you should extend lives in `ss/engine.py`.

Normal printing to the console won't work because the UI will be drawn over it. Instead, we provide a simple way to log to a file named `spreadsheet.log`. See `ss/__main__.py` for a usage example.
