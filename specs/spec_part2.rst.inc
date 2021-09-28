

Congratulations, your basic spreadsheet implementation looked great, so it's now time to build on it!

Spec additions
--------------

In addition to the types you implemented in part 1 (number, datetime, string, and link), we're going to support formalae.  

A **formula** is a cell value starting with `=`, followed by an expression which can either be:

 * a **cell reference** like `A1` (you've already implemented this!)
 * a **literal number or date** like `6.02e23` or `2018-01-01`
 * a **binary operator** (`+-*/`) on two sub-expressions (**operands**), like `A1 * 6.02e23`
     * There must be spaces on each side of the operand. (Otherwise we couldn't tell whether `2018-01-01` was a date or equal to the value `2016`!)
     * All binary operators are valid to apply to 2 numbers. For dates, only addition and subtraction are defined. If you add a number to a date, you get a date that many days in the future. If you subtract two dates, you get the difference between them in days. You can't add two dates.
 * a **function call** with any number of sub-expressions (**arguments**), like `sum(A1:B2, C3:D4)`. Function names are alphanumeric only and case-insensitive.

 When printed, a cell with a formula should display the result of evaluating the formula. If a set of cell formulae causes a circular reference (for instance A1 is `=A2` and A2 `=A1`) then it would be nice not to hang or crash.

Some spreadsheet functions may operate on a **range** of cells, written as two cell references separated by a colon (e.g. `A1:B3` is a 2x3 range). We will give you library functions for converting references and ranges to/from tuples; see the `sheet.models` module.

 **We will give you a pre-written** `parse` **function** to parse a formula string (without the `=` sign), because this function is boring and fiddly to write. See |formula| for details.

We recommend implementing these different types of functions in the order presented above (cell reference, literal number or date, binary operator, function call).

