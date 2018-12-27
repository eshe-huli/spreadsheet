import csv
import curses
import sys

from ss import engine, views, models

def read_csv(fname, sheet):
    with open(fname) as f:
        reader = csv.reader(f)
        for row, values in enumerate(reader):
            for col, value in enumerate(values):
                sheet.set(str(models.Index(row, col)), value)


if __name__ == '__main__':
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
        finally:
            curses.noraw()
