import pytest

from ss import formula


@pytest.mark.parametrize(
    "code,tree",
    [
        ("A1", "A1"),
        ("A1 + A2", ["+", "A1", "A2"]),
        ("2018-01-01", "2018-01-01"),
        ('"string"', "string"),
        ("function((1+1))", ["function", ["+", "1", "1"]]),
        ("a + b(c + d)", ["+", "a", ["b", ["+", "c", "d"]]]),
        ("a * b(c)", ["*", "a", ["b", "c"]]),
    ],
)
def test_parse(code, tree):
    assert formula.parse(code) == tree


@pytest.mark.parametrize(
    "higher,lower", [("*", "+"), ("*", "-"), ("/", "+"), ("/", "-")]
)
def test_precedence(higher, lower):
    assert formula.parse(f"a {lower} b {higher} c") == [lower, "a", [higher, "b", "c"]]
    assert formula.parse(f"a {higher} b {lower} c") == [lower, [higher, "a", "b"], "c"]


@pytest.mark.parametrize("fst,snd", [("+", "-"), ("-", "+"), ("*", "/"), ("/", "*")])
def test_associativity(fst, snd):
    """Test that +- and */ have equal precedence"""
    assert formula.parse(f"a {fst} b {snd} c {fst} d") == [
        fst,
        [snd, [fst, "a", "b"], "c"],
        "d",
    ]


@pytest.mark.parametrize(
    "code,expected",
    [
        ("b + a a", "Expected one of: (, *, /, +, -, [end of string]; got 'a'"),
        ("b + a1:b2(foo)", "a1:b2 is not a valid function name"),
        (
            "b + a +",
            "Expected one of: a literal value, a quoted string, (; got [end of string]",
        ),
    ],
)
def test_error_messages(code, expected):
    with pytest.raises(formula.ParseError) as e:
        formula.parse(code)
    assert expected in str(e)
