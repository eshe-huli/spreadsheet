.. default-role:: code

We're building a text-UI spreadsheet app named `sheet`. Here's what it looks like so far:

.. image:: screenshot.png
   :width: 674
   :height: 447

We've built the user interface (you'll get access right before the project starts)—your task is to design and build the spreadsheet engine based on the spec below. The point of this project is to see how well you can own a feature, from the problem description all the way to the fiddly details.

.. contents::

Prep
----

1. Read through the spec below, especially the list of tasks at the end.
2. Think through your major design choices. **Note:** The design of this project is subtle and easy to botch, so you will be well served by thinking it through!
3. Email your interviewer any questions you have about the spec or project.
4. Set up a fresh environment of Python 3.7 (if using Python) or Node 12.x (if using Javascript).

Interview structure
-------------------

This is a self-timed take home task.  You should plan to spend 2.5 hours on this starting from when you clone the codebase.  Once you submit your code, we'll take a look and run some tests on it and get back to you about next steps.  If you do well and we're both still excited, you'll pair with one of us to build on what you do now in your final interview.


How you will be evaluated
-------------------------

Here are our criteria for evaluating the project. They're stack ranked, so please prioritize them accordingly.

1. **High quality design** – your code should be easy to understand, debug and change. Try to create clean and well-specified components and interfaces.
2. **Functionality** – at a minimum, your engine should implement the spec below. If you are not sure about a particular edge case, it's up to you to choose the most user-friendly behaviour. Emulating the behaviour of other spreadsheet software like Google Sheets or Microsoft Excel is a safe choice.
3. **Extensibility** – you will pair with us to implement more features in the final interview, so think about what design choices will make that easiest. While you don't need to optimize for performance or write unit tests, try not to make assumptions that would make high performance or testing impossible later.

We care about being able to see the major elements of your design realized in code. If you are worried about running out of time, please *aggressively drop things* that don't seem interesting from a design/functionality perspective.

Finally, **don't worry about**:

- persisting any data.  If you quit the spreadsheet, it's ok if all the data is lost.
- actually writing unit tests (again, do worry about making it testable though!)
- trivial bugs/regressions (in the real world, you'd have automated tests to prevent these)
- actually optimizing your code, unless it takes you over 1 second to execute a simple command
- implementing more spreadsheet functions than the spec asks for
- security

You're welcome to use libraries. If you do, you *must* include them in `requirements-dev.txt` or `package.json` (otherwise we won't know what they are and won't be able to test your code!).

Logistics
---------

Do the prep steps above first.  Once you have a python or node environment set up and have your interview questions answered, download the code from the link sent to you in the same email and start the timer.  You can do that by going to that URL in a browser, or by running `curl <url> --output repo.bundle` to get the file.

To open that file, run

* `git clone repo.bundle spreadsheet --branch=part1`
* `cd spreadsheet`

This should create a `spreadsheet` directory with a git repository with the `part1` branch checked out, ready for you to work in it.

Before you start the timer, make sure the you can run the spreadsheet program.  You should see a grid of rectangles with the cell indeces printed in them.  If you aren't able to run it, stop and debug before starting the timer!

Once you start the timer, you have 2.5 hours to work on implementing the spec below.  Don't forget to take breaks to drink water!  

When you’re ready to submit:

* If you haven't been making commits as you go, commit your work with `git add . && git commit -m "completed spreadsheet"`
* Run `git bundle create commits.bundle part1 startingpoint --branches`
* Send the resulting `.bundle` file to us in an email


Spec
====

We've implemented the spreadsheet UI, but you need to implement the "engine" that actually stores and executes the spreadsheet computation.

We've defined the spreadsheet engine interface (see |engine|). You will implement parts of this interface (not all of it to start with!).

At the end of this section, we'll tell you which parts to implement in which order. But first we need to explain how the spreadsheet is supposed to work in general.

The spreadsheet data model
--------------------------

A spreadsheet is (displayed as) a 2-dimensional grid of cells. The columns of the grid are lettered `A, B, ... Z, AA, BB, ..., AAA, ...`. The rows of the grid are numbered `1, 2, ...`. There is no limit to the number of rows or columns of the spreadsheet.

Many spreadsheet operations act on a single cell. A cell is **referenced** by the concatenation of its row and column, e.g. `A1` (column 1, row 1) or `AZ590` (column 52, row 590).

Each cell contains a **value** which can be one of a few things:

* a **number** formatted like `1`, `1.23` or `6.02e23`;
* a **datetime** formatted like `2018-01-01` or `2018-01-01T13:45:56`;
* a **string** like `purple pandas`;
* a **reference** like `=A1`, that when evaluated, displays the contents of the cell A1 (if the contents of cell `A1` changes, the referring cell should reflect the new value);
* or the cell can be **empty**.

Finally, each cell has a **format** which controls how it is displayed, which can be either:

* a **number format** (controlling e.g. the number of digits after the decimal point);
* a **date format** (controlling e.g. whether or not the time is displayed);
* the **default format** which displays the value however you want.

For how the format is specified at the API level, see the relevant method in the section |engine| below.

Note that for a cell with a reference, the format should be based on the referring cell, and not the referred-to cell.  For example, if cell A1 contains the number `1` formatted as an integer, and cell B1 has the contents `=A1` and is formatted as money, cell A1 should display as `1` B1 should display as `$1.00`.

At a minimum, your engine should behave reasonably in the following situations.  There may be multiple "reasonable" ways for the spreadsheet to behave, but it should never freeze or crash:

* The user sets a cell's format, but it cannot be applied to the cell's existing value (e.g. formatting text as a number)
* The user enters a value into a cell, but it cannot be formatted using the cell's existing format (e.g. entering text into a number-formatted cell)
* The user sets an empty cell's format, then enters a value
* The user enters a value, then cycles the cell through various formats
* The user enters an format that doesn't apply to the data in the cell cell (e.g. formatting a cell with a date in it as a number)
* The user enters a number for which the format in the cell doesn't apply (e.g. entering a number into a cell which has a date format set)


Note that this is a small subset of what you might want from a spreadsheet!  We'll fill more of those gaps in the final interview.

Your tasks
----------

Here's the order in which you should do things. Each step comes with a CSV in the `examples` directory that you can load for a very basic/incomplete test of the "happy path." (Testing the unhappy path is up to you.)

1. Get `set` and `get_raw` working.
2. Get `set_format` working and make `get_formatted` apply the given format.
3. Make `get_formatted` follow references, e.g. `=A1`.

A full featured spreadsheet would do many more things, but stick to these for this part. You won't get extra credit for implementing anything besides these three things.

