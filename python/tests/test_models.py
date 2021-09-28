from sheet.index import Index
from sheet.range import Range


def test_parse_roundtrip():
    for row in range(50):
        for col in range(50):
            i = Index(row=row, col=col)
            s = str(i)
            assert Index.parse(s) == i
