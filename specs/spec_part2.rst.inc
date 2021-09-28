.. default-role:: code

Congratulations, your basic spreadsheet implementation looked great, so it's now time to build on it!  We'll be extinding our spreadsheet by building a wider variety of formulas, as specified below.

.. contents::

Interview structure
-------------------

This time, you'll screenshare with a Wave engineer to implement the changes on top of what you've already done on your spreadsheet.  We'll have two hours for this part of the interview.

We want to see how you think and solve problems, so we won't necessarily give you guidance, but if you're stuck, we won't let you spin your wheels (that's not interesting for us either), and we won't let you charge off in a direction that's not what we intended.  Please ask your interviewer questions if you have them, and if you ask them something we want you to figure out yourself, we'll tell you so.



How you will be evaluated
-------------------------

We'll use the same high-level criteria to evaluate you as for part 1.

1. **High quality design** that makes your engine easy to work with and change. Decoupled components talking to each other via clean and well-specified interfaces.
2. **User friendly details**--this spec is intentionally vague about many edge-cases or behavioral details. In these scenarios, it's up to you to choose the most user-friendly behavior. If you're not sure what behavior would be most user-friendly, talk it through with your interviewer.
3. **Extensibility.**  how easy is it to build even more features on top of what you've made so far?  You also still don't need to optimize for performance or write unit tests, but try not to make assumptions that would make high performance or testing impossible later.

You should prioritize *all* of these over finishing the entire spec.  We recommend implementing the new features one by one, and if we run out of time before they're all implemented, that's totally fine and doesn't mean you didn't do well.


As before, **don't worry about**:

- small-scale code polish (e.g. extensive docstrings or comments, maximally readable variable names). We evaluated that in the last round and your interviewer will learn the codebase by pairing with you :)
- actually writing unit tests (again, do worry about making it testable though!)
- trivial bugs/regressions (in the real world, you'd have automated tests to prevent these)
- actually optimizing your code, unless it takes you over 1 second to execute a simple command
- security


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

