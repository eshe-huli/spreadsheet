import csv
import curses
import sys

from ss import model, view

def read_csv(fname, sheet):
    with open(fname) as f:
        reader = csv.reader(f)
        for row, values in enumerate(reader):
            for col, value in enumerate(values):
                sheet.set(view.Position(row, col).ref(), value)


@curses.wrapper
def main(stdscr):
    curses.raw()
    try:
        sheet = model.Spreadsheet()
        if len(sys.argv) > 1:
            fname = sys.argv[1]
            read_csv(fname, sheet)
        viewer = view.Viewer(sheet, stdscr)
        viewer.loop()
    finally:
        curses.noraw()
