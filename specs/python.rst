Spreadsheet interview - Python
==============================

.. |engine| replace:: :ref:`py_engine`
.. |formula| replace:: :ref:`py_formula`

.. include:: spec.rst.inc

.. default-role:: any

Special instructions for Windows users
======================================
Before running the spreadsheet program on windows, please go to `requirements-dev.txt`, uncomment the `windows-curses` line and rerun `pip install -r requirements-dev.txt`.

This program is tested on Windows, but not as well as it's tested on unix-based systems, so please be extra sure that the program runs with no modifications before you start the timer and begin writing code.


Appendix: interfaces
====================

.. _py_engine:

The engine interface
--------------------

.. automodule:: sheet.engine
   :members:


The index library
-----------------------

.. autoclass:: sheet.models.Index
   :members:
   :special-members: __add__, __str__

Appendix: README
================

This will probably be more useful after you have source code access, but we're including it here for completeness.

.. include:: ../python/README.rst
