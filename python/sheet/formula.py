import ast
import re
import enum
from typing import NamedTuple

__all__ = ["parse", "ParseError"]


def parse(formula):
    """Parse a spreadsheet formula.

    Returns:
        a string for references/literals; for binary operators or function
        calls, it will return a list whose first element is the operator and
        whose second and third elements are the operands.

    Raises:
        ParseError: if the formula is syntactically invalid.

    For example:

    >>> parse('A1')
    'A1'
    >>> parse('2018-01-01')
    '2018-01-01'
    >>> parse('6.02e23')
    '6.02e23'
    >>> parse("miscellaneousliteral")
    'miscellaneousliteral'
    >>> parse('"string with spaces"')
    'string with spaces'
    >>> parse('A1 + A2')
    ['+', 'A1', 'A2']
    >>> parse('-1 + 2')
    ['+', '-1', '2']
    >>> parse('2 + -1')
    ['+', '2', '-1']
    >>> parse('A1 - A2 - A3')
    ['-', ['-', 'A1', 'A2'], 'A3']
    >>> parse('A1 - (A2 - A3)')
    ['-', 'A1', ['-', 'A2', 'A3']]
    >>> parse('A1 + A2 * A3')
    ['+', 'A1', ['*', 'A2', 'A3']]
    >>> parse('sum(A1:A2)')
    ['sum', 'A1:A2']
    >>> parse('sum(A1:A2, A3, A4)')
    ['sum', 'A1:A2', 'A3', 'A4']
    >>> parse('sqrt((1+1))')
    ['sqrt', ['+', '1', '1']]
    >>> parse('A1 + sqrt(A2 + A3)')
    ['+', 'A1', ['sqrt', ['+', 'A2', 'A3']]]

    >>> parse("a1:b1(1, 2, 3)")
    Traceback (most recent call last):
        ...
    sheet.formula.ParseError: ...

    >>> parse("1 + ")
    Traceback (most recent call last):
        ...
    sheet.formula.ParseError: ...

    >>> parse("")
    Traceback (most recent call last):
        ...
    sheet.formula.ParseError: ...
    """
    tokens = (
        token for token in tokenize(formula) if token.type != TokenType.WHITESPACE
    )
    return Parser(tokens).parse()


# If you add a group here, add it to TokenType below also
LEXER = re.compile(
    r"""
(?P<lparen>\()
| (?P<rparen>\))
| (?P<plus>\+)
| (?P<minus>-\ )  # Hack: minus must be followed by whitespace (else -1 won't parse)
| (?P<value>[a-zA-Z0-9:\.-]+)
| (?P<quoted>"[^"]+")
| (?P<times>\*)
| (?P<divided>/)
| (?P<comma>,)
| (?P<whitespace>\s+)
""",
    re.VERBOSE,
)

FUNCTION_NAME = re.compile(r"^[a-zA-Z]+$")


class TokenType(enum.Enum):
    """Enum for different kinds of tokens.

    The enum's 'value' is an English description of the kind of token, for
    error messaging."""

    LPAREN = "("
    RPAREN = ")"
    VALUE = "a literal value"
    QUOTED = "a quoted string"
    PLUS = "+"
    MINUS = "-"
    TIMES = "*"
    DIVIDED = "/"
    COMMA = ","
    EOF = "[end of string]"
    WHITESPACE = "whitespace"


class Token(NamedTuple):
    type: TokenType
    text: str


def tokenize(text):
    """Split `text` into a stream of `Token` objects.

    Raises ParseError if an illegal token is encountered.

    Note that we return whitespace tokens (to make it easier to
    programmatically manipulate formulae, for instance moving cells around).
    """
    last = 0
    for match in LEXER.finditer(text):
        start, end = match.span()
        if start != last:
            bad_token = text[last:start]
            raise ParseError(f"Unknown token {bad_token!r}")
        last = end
        values = [(k, v) for k, v in match.groupdict().items() if v]
        assert len(values) == 1
        (groupname, value) = values[0]
        if groupname != "whitespace":
            yield Token(getattr(TokenType, groupname.upper()), value)


class Parser:
    """Recursive-descent formula parser."""

    def __init__(self, token_iter):
        self.token_iter = token_iter
        self.cur = self._next()
        # list of the tokens we attempted to consume since the last successful
        # token-consumption (for error messages)
        self.attempted_types = []

    def _next(self):
        try:
            return next(self.token_iter)
        except StopIteration:
            return Token(TokenType.EOF, "")

    def parse(self):
        return self.toplevel()

    def consume(self, type):
        """If the current token is of the given type, consume and return it.

        Else return None."""
        cur = self.cur
        if cur.type == type:
            self.cur = self._next()
            self.attempted_types = []
            return cur
        self.attempted_types.append(type)
        return None

    def expect(self, type):
        """If the current token is of type `type`, return it; otherwise raise
        a ParseError."""
        if not self.consume(type):
            self.raise_unexpected_token()

    def raise_unexpected_token(self):
        """Raise a ParseError describing all the token types that were allowed
        to be put here."""
        types_desc = ", ".join(list(t.value for t in self.attempted_types))
        if self.cur.type == TokenType.EOF:
            got = "[end of string]"
        else:
            got = repr(self.cur.text)
        raise ParseError(f"Expected one of: {types_desc}; got {got}")

    def toplevel(self):
        tm = self.expr()
        self.expect(TokenType.EOF)
        return tm

    def expr(self):
        return self.sum()

    def sum(self):
        tm = self.summand()
        while True:
            if self.consume(TokenType.PLUS):
                tm = ["+", tm, self.summand()]
            elif self.consume(TokenType.MINUS):
                tm = ["-", tm, self.summand()]
            else:
                break
        return tm

    def summand(self):
        tm = self.factor()
        while True:
            if self.consume(TokenType.TIMES):
                tm = ["*", tm, self.factor()]
            elif self.consume(TokenType.DIVIDED):
                tm = ["/", tm, self.factor()]
            else:
                break
        return tm

    def factor(self):
        tm = self.consume(TokenType.VALUE)
        if tm is not None:
            if self.consume(TokenType.LPAREN):
                # check if it's a valid function name
                name = tm.text
                if not FUNCTION_NAME.match(name):
                    raise ParseError(f"{name} is not a valid function name")
                args = self.arglist()
                self.expect(TokenType.RPAREN)
                return [name] + args
            return tm.text
        tm = self.consume(TokenType.QUOTED)
        if tm is not None:
            return tm.text.strip('"')
        if self.consume(TokenType.LPAREN):
            tm = self.expr()
            self.expect(TokenType.RPAREN)
            return tm
        self.raise_unexpected_token()

    def arglist(self):
        tm = [self.expr()]
        while self.consume(TokenType.COMMA):
            tm.append(self.expr())
        return tm


class ParseError(Exception):
    pass
