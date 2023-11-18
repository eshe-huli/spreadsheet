import re
import logging
from datetime import datetime

from .models import Index
from . import errors as err


class Cell:
    AVAILABLE_FORMAT_TYPES = {
        'default': None,
        'number': [r'%.0f', r'%.2f'],
        'date': [r'%Y-%m-%d', r'%Y-%m-%d %H:%M:%S'],
    }

    def __init__(self):
        self.raw_data = ""
        self.format_type = "default"
        self.format_spec = None

    def set_data(self, data):
        logging.debug(f"Setting cell data: {data}")
        self.raw_data = data

    def get_raw_data(self):
        return self.raw_data

    def set_format(self, format_type, format_spec):
        logging.debug(f"Setting cell format: Type={format_type}, Spec={format_spec}, cell={self}")
        # Validate format type and spec combination against AVAILABLE_FORMAT_TYPES
        if format_type not in self.AVAILABLE_FORMAT_TYPES:
            logging.error(f"Invalid format type '{format_type}'")
            return err.VALUE

        if format_spec is not None and format_spec not in self.AVAILABLE_FORMAT_TYPES[format_type]:
            logging.error(f"Invalid format spec '{format_spec}' for type '{format_type}'")
            return err.VALUE

        self.format_type = format_type
        self.format_spec = format_spec

    def get_formatted_data(self, spreadsheet, visited_cells=None):
        # Check for circular references
        if visited_cells is None:
            visited_cells = set()

        if self in visited_cells:
            logging.warning("Circular reference detected.")
            return err.CIRCULAR_REFERENCE

        visited_cells.add(self)

        if self.raw_data.startswith('='):
            return self.evaluate_formula(self.raw_data[1:], spreadsheet, visited_cells)

        return self.apply_format(self.raw_data)

    def evaluate_formula(self, formula, spreadsheet, visited_cells):
        logging.debug(f"Evaluating formula: {formula}")

        # Extract all cell references and other components of the formula
        components = re.findall(r'[A-Za-z]+[0-9]+|\d+|\D+', formula)

        for comp in components:
            if re.match(r'[A-Za-z]+[0-9]+', comp):
                try:
                    ref_index = Index.parse(comp)
                except ValueError as e:
                    logging.error(f"Invalid cell reference '{comp}': {e}")
                    return err.REF

                if ref_index not in spreadsheet.cells:
                    return err.REF

                cell = spreadsheet.cells[ref_index]
                cell_value = cell.get_formatted_data(spreadsheet, visited_cells)

                if cell_value.strip() == '':
                    return err.NULL

                if isinstance(cell_value, str) and not cell_value.isdigit():
                    # Add quote to non digit
                    cell_value = f'"{cell_value}"'
                elif isinstance(cell_value, datetime):
                    # Convert datetime to a string
                    cell_value = f'"{cell_value.isoformat()}"'

                formula = formula.replace(comp, str(cell_value))
            else:
                pass

        try:
            result = eval(formula)
            return str(result)
        except ZeroDivisionError:
            return err.DIV0
        except Exception as e:
            logging.error(f"Error evaluating formula '{formula}': {e}")
            return err.ERROR

    def apply_format(self, data):
        if self.format_type == 'default':
            return data

        if self.format_type == 'number':
            try:
                return self.format_spec % float(data)
            except ValueError:
                logging.error("Invalid number for formatting: " + data)
                return err.VALUE

        if self.format_type == 'date':
            try:
                if re.match(r'\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?', data):
                    # Data is in 'YYYY-MM-DD' format
                    # Try parsing with time first
                    try:
                        date = datetime.strptime(data, '%Y-%m-%dT%H:%M:%S')
                    except ValueError:
                        # Fallback to date only
                        date = datetime.strptime(data, '%Y-%m-%d')
                elif re.match(r'\d{2}-\d{2}-\d{4}(T\d{2}:\d{2}:\d{2})?', data):
                    # Data is in 'DD-MM-YYYY' format
                    # Try parsing with time first
                    try:
                        date = datetime.strptime(data, '%d-%m-%YT%H:%M:%S')
                    except ValueError:
                        # Fallback to date only
                        date = datetime.strptime(data, '%d-%m-%Y')
                else:
                    logging.error("Unrecognized date format: " + data)
                    return err.VALUE

                return date.strftime(self.format_spec)
            except ValueError:
                logging.error("Error parsing date: " + data)
                return err.VALUE

        return data
