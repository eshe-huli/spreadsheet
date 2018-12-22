import curses, atexit

from ss import model, view

@curses.wrapper
def main(stdscr):
    sheet = model.Spreadsheet()
    viewer = view.Viewer(sheet, stdscr)
    viewer.loop()
