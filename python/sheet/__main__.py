import csv
import curses
import logging
import pathlib
import sys

from sheet import engine, views, index


def read_csv(fname, sheet):
    with open(fname) as f:
        reader = csv.reader(f)
        for row, values in enumerate(reader):
            for col, value in enumerate(values):
                sheet.set(index.Index(row, col), value)


def setup_logging():
    """Set up Python's log infrastructure with some simple defaults:
    - append to 'spreadsheet.log' in the 'python' directory
    - include the date/time on every message
    - set loglevel to DEBUG
    """
    logfile = pathlib.Path(__file__).parent.parent / "spreadsheet.log"
    logging.basicConfig(
        format="[%(asctime)s]: %(message)s", filename=logfile, level=logging.DEBUG
    )


if __name__ == "__main__":
    setup_logging()
    logging.info("--------------------")
    logging.info("Spreadsheet starting")

    @curses.wrapper
    def main(stdscr):
        curses.raw()
        try:
            sheet = engine.Spreadsheet()
            if len(sys.argv) > 1:
                fname = sys.argv[1]
                read_csv(fname, sheet)
            viewer = views.Viewer(sheet, stdscr)
            viewer.loop()

            logging.info("Exiting.")
        finally:
            curses.noraw()
