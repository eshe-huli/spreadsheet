Spreadsheet interview - Javascript
==================================

.. default-domain:: js

.. include:: spec.rst

.. default-role:: any

Appendix: interfaces
====================

.. _engine:

The engine interface
--------------------

.. js:autoclass:: engine.Spreadsheet
   :members:

The formula library
-------------------

.. js:autofunction:: formula.parse

.. js:autoclass:: formula.ParseError

The index/range library
-----------------------

.. js:autoclass:: models.Index
   :members:

.. js:autoclass:: models.Range
   :members:

.. js:autoclass:: models.ValueError

Appendix: README
================

This will probably be more useful after you have source code access, but we're including it here for completeness.

.. include:: ../javascript/README.rst
