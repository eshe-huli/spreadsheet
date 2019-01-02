/** TODO
 * - Framerate counter
 */

const { Index, Range } = require("./models.js");

const KEY_DELTAS = {
  left: { row: 0, col: -1 },
  right: { row: 0, col: 1 },
  up: { row: -1, col: 0 },
  down: { row: 1, col: 0 }
};
const attrs = {
  INVERSE: "inverse",
  BOLD: "bold",
  UNDERLINE: "underline",
  NORMAL: null
};

const ESCAPE_KEYS = ["escape", "C-g"];

class Position {
  constructor(y, x) {
    this.y = y;
    this.x = x;
  }

  equals(other) {
    return this.y == other.y && this.x == other.x;
  }
  add(other) {
    return this.binop((a, b) => a + b, other);
  }
  sub(other) {
    return this.binop((a, b) => a - b, other);
  }
  max(other) {
    return this.binop(Math.max, other);
  }
  min(other) {
    return this.binop(Math.min, other);
  }
  /** Apply a binary operator to both `y` and `x`, producing a new Position.
   */
  binop(f, other) {
    return new Position(f(this.y, other.y), f(this.x, other.x));
  }
  toString() {
    return `(${this.y}, ${this.x})`;
  }
}

class Rectangle {
  constructor(pos1, pos2) {
    this.topLeft = pos1.min(pos2);
    this.bottomRight = pos1.max(pos2);
  }
  static fromDimensions(pos, dims) {
    return new Rectangle(pos, pos.add(dims));
  }
  static fromSides({ top, bottom, left, right }) {
    return new Rectangle(new Position(top, left), new Position(bottom, right));
  }
  get width() {
    return this.bottomRight.x - this.topLeft.x;
  }
  get height() {
    return this.bottomRight.y - this.topLeft.y;
  }
  get top() {
    return this.topLeft.y;
  }
  get bottom() {
    return this.bottomRight.y;
  }
  get left() {
    return this.topLeft.x;
  }
  get right() {
    return this.bottomRight.x;
  }
  get bottomLeft() {
    return new Position(this.bottom, this.left);
  }
  get topRight() {
    return new Position(this.top, this.right);
  }
  toString() {
    return `${this.topLeft} -> ${this.bottomRight}`;
  }
}

class EditBox {
  constructor(text) {
    this.text = text;
    this.cursor = text.length;
  }
  insert(ch) {
    this.text =
      this.text.slice(0, this.cursor) + ch + this.text.slice(this.cursor);
    this.cursor += ch.length;
  }
  backspace() {
    this.cursor -= 1;
    this.text =
      this.text.slice(0, this.cursor) + this.text.slice(this.cursor + 1);
  }
  moveCursor(delta) {
    this.cursor = Math.min(Math.max(this.cursor + delta, 0), this.text.length);
  }
}

/** Spreadsheet viewer.
 *
 * Architectural notes:
 *
 * - Because this is a port of a Python program that did not have `blessed`
 * available, we kind of ignore all the nice features of `blessed` and just use
 * it as an ncurses replacement. We split the screen up into a few `box`
 * elements but otherwise manage everything ourselves--meaning we listen for
 * every key event from `screen` instead of relying the focus method; we
 * manually draw the table by setting `box.content`; etc.
 */
class SpreadsheetView {
  constructor(engine, program) {
    this.engine = engine;
    this.program = program;
    this.topLeft = this.cursor = new Index(0, 0);
    this.message = "Welcome to the spreadsheet!";
    this.editBox = null;
    this.menu = null;
    // menu is {title:, options: [{key:, name:, value:}], onSelected}
    this.selectingFrom = null;
    this.selectingTo = null;
    this.program.on("keypress", (ch, key) => this.handleInput(ch, key));
    this.handleKey = this.handleKeyDefault;
    this.DEFAULT_SHORTCUTS = {
      return: { name: "edit", handle: this.editCurrent },
      backspace: { name: "clear", handle: this.clearCurrent },
      "C-w": { name: "copy", handle: this.beginCopy },
      "C-y": { name: "paste", handle: this.paste },
      "C-c": { name: "quit", handle: this.quit },
      "C-f": { name: "format", handle: this.selectFormat },
      "C-s": { name: "sort", handle: this.enterSortMenu }
    };
    this.redraw();
  }
  measure() {
    const height = this.program.rows,
      width = this.program.cols;
    const screen = Rectangle.fromSides({
      top: 0,
      left: 0,
      bottom: height,
      right: width
    });

    // Header
    const shortcuts = Rectangle.fromDimensions(screen.topLeft, {
      y: 2,
      x: width
    });
    const editBox = Rectangle.fromDimensions(shortcuts.bottomLeft, {
      y: 1,
      x: width
    });
    // Footer
    const message = new Rectangle(
      screen.bottomLeft.sub({ y: 1, x: 0 }),
      screen.bottomRight
    );
    // Grid
    const gridAndLabels = new Rectangle(editBox.bottomRight, message.topLeft);
    const maxRow = this.topLeft.add({ y: gridAndLabels.height - 1, x: 0 });
    const rowLabelWidth = maxRow.rowLabel.length + 1;
    const rowLabels = Rectangle.fromDimensions(gridAndLabels.topLeft, {
      y: gridAndLabels.height,
      x: rowLabelWidth
    });
    const grid = new Rectangle(rowLabels.topRight, gridAndLabels.bottomRight);
    this.layout = {
      grid,
      rowLabels,
      message,
      editBox,
      shortcuts
    };
  }
  handleInput(ch, key) {
    this.message = "";
    this.handleKey(ch, key);
    this.redraw();
  }
  handleKeyDefault(ch, key) {
    if (["escape", "C-c"].includes(key.full)) {
      return process.exit(0);
    } else if (["left", "right", "up", "down"].includes(key.full)) {
      this.moveCursorBy(KEY_DELTAS[key.full]);
    } else if (isCharacter(key)) {
      this.beginEditing("");
      this.handleKeyEdit(ch, key);
    } else if (key.full == "C-`") {
      this.beginSelecting();
    } else if (ESCAPE_KEYS.includes(key.full)) {
      this.finishSelecting();
    } else if (key.full in this.DEFAULT_SHORTCUTS) {
      this.DEFAULT_SHORTCUTS[key.full].handle.apply(this);
    } else {
      this.message = `Unknown key ${key.full}`;
    }
  }
  editCurrent() {
    const value = this.engine.getRaw(this.cursor);
    this.beginEditing(value);
  }
  clearCurrent() {
    for (const index of this.selection.indices) {
      this.engine.set(index, "");
    }
  }
  beginCopy() {
    this.selectingFrom = this.selectingFrom || this.cursor;
    this.selectingTo = this.cursor;
  }
  paste() {
    if (this.selectingTo == null) {
      this.message = "Copy a cell or range with C-w first";
      return;
    }
    this.engine.copy(this.selection, this.cursor);
    this.finishSelecting();
  }
  enterSortMenu() {
    if (this.selectingFrom == null) {
      this.message = "Select a range first with C-[space]";
      return;
    }
    const selection = this.selection;
    const indices = [...selection.row(0)];
    if (indices.length > 10) {
      this.message = "Cannot sort more than 10 columns";
      return;
    }
    const choices = indices.map((index, i) => {
      return {
        key: i.toString(),
        name: index.columnLabel,
        value: index.col
      };
    });
    this.enterMenu({
      title: `Sort ${selection.label}`,
      choices,
      onSelected: col => {
        return {
          title: `Sort ${selection.label} direction`,
          choices: [
            { key: "a", name: "Ascending", value: [col, true] },
            { key: "d", name: "Descending", value: [col, false] }
          ],
          onSelected: ([col, asc]) => {
            this.engine.sort(selection, col, asc);
          }
        };
      }
    });
  }
  selectFormat() {
    this.enterMenu({
      title: `Format ${this.selection.label}`,
      choices: [
        { key: "C-o", name: "default", value: ["default", null] },
        { key: "C-i", name: "1", value: ["number", "%d"] },
        { key: "C-i", name: "1.23", value: ["number", "%0.2f"] },
        { key: "C-s", name: "$1.23", value: ["number", "$%0.2f"] },
        { key: "C-d", name: "2018-01-01", value: ["date", "%Y-%m-%d"] },
        {
          key: "C-t",
          name: "2018-01-01 13:34:45",
          value: ["date", "%Y-%m-%d %H:%M:%S"]
        }
      ],
      onSelected: ([type, spec]) => {
        for (const index of this.selection.indices) {
          this.engine.setFormat(index, type, spec);
        }
      }
    });
  }
  //// Selection
  beginSelecting() {
    this.selectingFrom = this.cursor;
  }
  finishSelecting() {
    this.selectingFrom = null;
    this.selectingTo = null;
  }
  get selection() {
    return new Range(
      this.selectingFrom || this.cursor,
      this.selectingTo || this.cursor
    );
  }
  //// Editing
  beginEditing(text) {
    this.editBox = new EditBox(text);
    this.handleKey = this.handleKeyEdit;
  }
  finishEditing(commit) {
    if (commit) {
      this.engine.set(this.cursor, this.editBox.text);
    }
    this.editBox = null;
    this.handleKey = this.handleKeyDefault;
  }
  handleKeyEdit(ch, key) {
    const FINISH_KEYS = {
      return: { y: 1, x: 0 },
      tab: { x: 1, y: 0 }
    };
    const MOVEMENT_KEYS = {
      left: -1,
      right: 1
    };
    const ABORT_KEYS = ["up", "down"];
    const BACKSPACE_KEYS = ["backspace", "C-h"];
    if (key.full in FINISH_KEYS) {
      this.finishEditing(true);
      this.moveCursorBy(FINISH_KEYS[key.full]);
    } else if (isCharacter(key)) {
      this.editBox.insert(getCharacter(key));
    } else if (BACKSPACE_KEYS.includes(key.full)) {
      this.editBox.backspace();
    } else if (key.full in MOVEMENT_KEYS) {
      this.editBox.moveCursor(MOVEMENT_KEYS[key.full]);
    } else if (ESCAPE_KEYS.includes(key.full)) {
      this.finishEditing(false);
    } else if (ABORT_KEYS.includes(key.full)) {
      this.finishEditing(false);
      this.handleKeyDefault(ch, key);
    } else {
      this.message = `Unknown key ${key.full}`;
    }
  }
  //// Menus
  enterMenu(menu) {
    this.menu = menu;
    this.handleKey = this.handleKeyMenu;
  }
  exitMenu() {
    this.menu = null;
    this.handleKey = this.handleKeyDefault;
  }
  handleKeyMenu(ch, key) {
    const chosen = this.menu.choices.find(choice => choice.key == key.full);
    if (chosen != null) {
      const newMenu = this.menu.onSelected(chosen.value);
      if (newMenu == null) {
        this.exitMenu();
      } else {
        this.enterMenu(newMenu);
      }
    } else if (ESCAPE_KEYS.includes(key.full)) {
      this.exitMenu();
    } else {
      this.message = `Unknown key ${key.full}`;
    }
  }
  //// Drawing
  /** Refill self.grid with the currently-visible cells.
   */
  redraw() {
    this.measure();
    this.draw();
  }
  write(pos, str, attr) {
    if (pos != null) {
      this.program.setx(pos.x);
      this.program.sety(pos.y);
    }
    this.program._write(this.program.text(str, attr));
  }
  draw() {
    this.program.clear();
    const grid = this.layout.grid;
    const nRows = this.numRowsDisplayed;
    let topLeft = this.topLeft;
    let x = 0;
    while (x < grid.width) {
      this.drawColumn(
        new Range(topLeft, topLeft.add({ row: nRows - 1, col: 0 })),
        grid.topLeft.add({ y: 0, x: x })
      );
      x += this.getColumnWidth(topLeft.col);
      topLeft = topLeft.add({ col: 1, row: 0 });
    }
    this.drawRowLabels();
    this.drawMessage();
    this.drawShortcuts();
    this.drawEditor();
    this.program.flush();
    /*
        self.draw_framerate()
        */
  }
  drawRowLabels() {
    let rect = this.layout.rowLabels;
    this.write(rect.topLeft, " ".repeat(rect.width), attrs.INVERSE);
    for (let i = 0; i < this.numRowsDisplayed; i++) {
      let label = alignRight(
        this.topLeft.add({ row: i, col: 0 }).rowLabel,
        rect.width
      );
      this.write(rect.topLeft.add({ x: 0, y: i + 1 }), label, attrs.INVERSE);
    }
  }
  drawColumn(range, pos) {
    // header
    const col = range.first.col;
    const width = Math.min(
      this.getColumnWidth(col),
      this.layout.grid.bottomRight.x - pos.x
    );
    if (width < 3) {
      // just finish the column header
      this.write(pos, " ".repeat(width), attrs.INVERSE);
      return;
    }
    const label = " " + alignCenter(range.first.columnLabel, width - 1);
    this.write(pos, label, attrs.INVERSE);
    // draw the values
    [...range.indices].map((index, dy) => {
      const value = this.engine.getFormatted(index);
      const text = " " + alignRight(value, width - 1);
      let attr = attrs.NORMAL;
      if (this.selectingFrom == null) {
        if (this.cursor.equals(index)) {
          attr = attrs.INVERSE;
        }
      } else {
        const isSelected = this.selection.contains(index),
          isCursor = this.cursor.equals(index);
        if (isSelected || isCursor) {
          if (isSelected && isCursor) {
            // For some reason 'gray fg' makes the bg gray :(
            attr = [attrs.INVERSE, attrs.BOLD, "gray fg"];
          } else {
            attr = attrs.INVERSE;
          }
        }
      }
      this.write(pos.add({ y: dy + 1, x: 0 }), text, attr);
    });
  }
  drawMessage() {
    const label = alignCenter(this.message, this.layout.message.width);
    this.write(this.layout.message.topLeft, label);
  }
  drawShortcuts() {
    let title, shortcuts;
    if (this.editBox != null) {
      title = "";
      shortcuts = [
        ["enter", "set+down"],
        ["tab", "set+right"],
        ["C-g", "cancel"]
      ];
    } else if (this.menu != null) {
      title = this.menu.title + ">";
      shortcuts = this.menu.choices.map(choice => [choice.key, choice.name]);
    } else {
      title = "";
      shortcuts = [];
      for (const key in this.DEFAULT_SHORTCUTS) {
        let shortcut = this.DEFAULT_SHORTCUTS[key];
        if (shortcut.name.length > 0) {
          shortcuts.push([key, shortcut.name]);
        }
      }
      if (this.selectingFrom) {
        shortcuts.push(["C-g", "cancel"]);
      } else {
        shortcuts.push(["C-<space>", "select"]);
      }
    }
    const rect = this.layout.shortcuts;
    const INDENT = 4;
    let pos = rect.topLeft.add({ x: INDENT, y: 0 });
    if (title.length > 0) {
      this.write(pos, title);
      pos = pos.add({ y: 0, x: title.length + 1 });
    }
    shortcuts.forEach(([keyname, text]) => {
      if (pos.x + keyname.length + text.length + 2 >= rect.width) {
        pos = rect.topLeft.add({ y: pos.y + 1, x: INDENT * 2 });
      }
      this.write(pos, keyname, attrs.INVERSE);
      pos = pos.add({ x: keyname.length + 1, y: 0 });
      this.write(pos, text);
      pos = pos.add({ x: text.length + 1, y: 0 });
    });
  }
  drawEditor() {
    if (this.editBox == null) {
      this.program.hideCursor();
    } else {
      this.write(this.layout.editBox.topLeft, this.editBox.text);
      this.program.setx(this.layout.editBox.left + this.editBox.cursor);
      this.program.showCursor();
    }
  }
  // Return the width of the row-label section (including padding).
  get rowLabelWidth() {
    return this.layout.rowLabels.width;
  }
  get numColumnsDisplayed() {
    const w = this.layout.grid.width;
    let x = 0,
      curColumn = this.topLeft.col;
    while (x < w) {
      x += this.getColumnWidth(curColumn);
      curColumn += 1;
    }
    return curColumn - this.topLeft.col - 1; // last only partly displayed
  }
  get numRowsDisplayed() {
    return this.layout.rowLabels.height - 1;
  }
  getColumnWidth(column) {
    return 9;
  }
  moveCursorBy(delta) {
    this.cursor = this.cursor.add(delta).max({ row: 0, col: 0 });
    // Ensure cursor is visibnle: top left can't be greater than the
    // cursor...
    this.topLeft = this.topLeft.min(this.cursor);
    // or less than the cursor minus the displayed region.
    this.topLeft = this.topLeft.max(
      this.cursor.sub({
        row: this.numRowsDisplayed - 1,
        col: this.numColumnsDisplayed - 1
      })
    );
    this.redraw();
  }
}

function alignRight(str, width) {
  if (str.length > width) {
    return str.slice(0, width - 2) + "..";
  }
  return " ".repeat(width - str.length) + str;
}

function alignCenter(str, width) {
  if (str.length > width) {
    return str.slice(0, width - 2) + "..";
  }
  const padding = width - str.length,
    pLeft = Math.floor(padding / 2),
    pRight = padding - pLeft;
  return " ".repeat(pLeft) + str + " ".repeat(pRight);
}

const CHARACTERS = {
  space: " "
};
function getCharacter(key) {
  if (key.full.length == 1) return key.full;
  return CHARACTERS[key.full];
}
function isCharacter(key) {
  return getCharacter(key) != null;
}

module.exports = {
  SpreadsheetView
};
