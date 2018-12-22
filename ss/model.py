from typing import NamedTuple

class Spreadsheet:
    def get_formatted(self, ref):
        return ref
    def get_raw(self, ref):
        return f'="{ref}"'
    def set(self, ref, raw):
        raise NotImplementedError()
    def set_format(self, range, type, spec):
        raise NotImplementedError()
    def copy(self, src, dest):
        raise NotImplementedError()
    def sort(self, range, column):
        raise NotImplementedError()
