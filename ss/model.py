from typing import NamedTuple

class Spreadsheet:
    def get_formatted(self, ref):
        return ref
    def get_raw(self, ref):
        return f'="{ref}"'
    def set(self, ref, raw):
        raise NotImplementedError(f"set {ref} = {raw!r}")
    def set_format(self, range, type, spec):
        raise NotImplementedError(f"set_format {range} {type} {spec}")
    def copy(self, src, dest):
        raise NotImplementedError(f"copy {src} {dest}")
    def sort(self, range, column):
        raise NotImplementedError(f"sort {range} {column}")
