import curses

from ss import model, view

@curses.wrapper
def main(stdscr):
    curses.raw()
    try:
        sheet = model.Spreadsheet()
        viewer = view.Viewer(sheet, stdscr)
        viewer.loop()
    finally:
        curses.noraw()
