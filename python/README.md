## Usage

Run in a python 3.7 virtualenv.

To open a new spreadsheet, run `python -m ss` from this directory.

To open a CSV file (useful as a shortcut for testing), run `python -m ss
../examples/1-basic.csv`. Note that you must have implemented the `set` and
`get_raw` functions in order for this to do anything useful. Check out the other
CSVs in the `../examples/` directory for some possibly useful test files.

## Extension

The spreadsheet class you should extend lives in `ss/engine.py`.

## For interviewers (not candidates)

Dev setup:

```
python -m venv .venv
pip install -r requirements-dev.txt
pytest
```
