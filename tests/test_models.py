from ss.models import Index, Range

def test_parse_roundtrip():
    for row in range(50):
        for col in range(50):
            i = Index(row=row, col=col)
            s = str(i)
            assert Index.parse(s) == i

def test_addition():
    assert Index(2, 3) + (4, 5) == Index(6, 8)
    assert Index(2, 3) - (1, 3) == Index(1, 0)

def test_range():
    assert Range.parse('ZZ1:A10') == Range(
        Index.parse('A1'),
        Index.parse('ZZ10')
    )
