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

1. **High quality design** that makes your engine easy to work with and change. Decoupled components talking to each other via clean and well-specified interfaces.
2. **User friendly details**--this spec is intentionally vague about many edge-cases or behavioral details. In these scenarios, it's up to you to choose the most user-friendly behavior. If you're not sure what behavior would be most user-friendly, talk it through with your interviewer.
3. **Extensibility.** You will pair with us to implement more features in the final interview, so think about what design choices will make that easiest.  Similarly, you don't need to optimize for performance or write unit tests, but try not to make assumptions that would make high performance or testing impossible later.

You should prioritize *all* of these over finishing the entire spec. All we care about is being able to see the major elements of your design realized in code. If you are worried about running out of time, please *aggressively drop things* that don't seem interesting from a design/user-friendliness perspective.

Finally, **don't worry about**:

- small-scale code polish (e.g. extensive docstrings or comments, maximally readable variable names). We evaluated that in the last round and your interviewer will learn the codebase by pairing with you :)
- actually writing unit tests (again, do worry about making it testable though!)
- trivial bugs/regressions (in the real world, you'd have automated tests to prevent these)
- actually optimizing your code, unless it takes you over 1 second to execute a simple command
- security

Logistics
---------

Once you're ready to start, we'll send you the URL of the existing code.  You'll run `curl` on that URL and get a file called `repo.bundle`.  To open that file, run `git clone repo.bundle spreadsheet`.

This should create a `spreadsheet` directory with a git repository with the `part1` branch checked out, ready for you to work in it.

When you’re ready to submit:
* If you haven't been making commits as you go, commit your work with `git add . && git commit -m "completed spreadsheet"`
* Run `git bundle create commits.bundle part1 startingpoint`
* Send the resulting `.bundle` file to us in an email


Spec
====

We've implemented the spreadsheet UI, but you need to implement the "engine" that actually stores and executes the spreadsheet computation.

We've defined the spreadsheet engine interface (see |engine|). You will implement parts of this interface (not all of it to start with!).

At the end of this section, we'll tell you which parts to implement in which order. But first we need to explain how the spreadsheet is supposed to work in general.

The spreadsheet data model
--------------------------

A spreadsheet is (displayed as) a 2-dimensional grid of cells. The columns of the grid are lettered `A, B, ... Z, AA, BB, ..., AAA, ...`. The rows of the grid are numbered `1, 2, ...`. There is no limit to the number of rows or columns of the spreadsheet.

Many spreadsheet operations act on a single cell. A cell is **referenced** by the concatenation of its row and column, e.g. `A1` (column 1, row 1) or `ZZ590` (column 52, row 590).

Each cell contains a **value** which can be one of a few things:

* A **number** formatted like `1`, `1.23` or `6.02e23`
* A **datetime** formatted like `2018-01-01` or `2018-01-01T13:45:56`
* A **string** like `purple pandas`
* A **link** like `=A1`, that when evaluated, displays the contents of the cell A1
* The cell can also be **empty**.

Finally, each cell has a **format** which controls how it is displayed, which can be either:

* A **number format** (controlling e.g. the number of digits after the decimal point)
* A **date format** (controlling e.g. whether or not the time is displayed)
* The **default format** which displays the value however you want.

For how the format is specified at the API level, see the relevant method in the section |engine| below.

Note that this is a small subset of what you might want from a spreadsheet!  We'll fill more of those gaps in the final interview

Your tasks
----------

Here's the order you should do things in. Each step comes with a CSV in the `examples` directory that you can load for a very basic/incomplete test of the "happy path." (Testing the unhappy path is up to you.)

1. Get `set` and `get_raw` working.
2. Get `set_format` working and make `get_formatted` apply the given format.
3. Make `get_formatted` follow references, e.g. `=A1`.


