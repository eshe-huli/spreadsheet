from ss.models import Index, Range

def test_parse_roundtrip():
    for row in range(50):
        for col in range(50):
            i = Index(row=row, col=col)
            s = str(i)
            assert Index.parse(s) == i

def test_range_denormalized():
    assert Range.parse('ZZ1:A10') == Range(
        Index.parse('A1'),
        Index.parse('ZZ10')
    )
