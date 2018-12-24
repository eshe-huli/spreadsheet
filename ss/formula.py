import ast
import re
import enum
from typing import NamedTuple

def parse(formula):
    """Parse a spreadsheet formula.


    """
    tokens = tokenize(formula)
    return Parser(tokens).parse()

# If you add a group here, add it to TokenType below also
LEXER = re.compile(r"""
(?P<lparen>\()
| (?P<rparen>\))
| (?P<plus>\+)
| (?P<minus>-)
| (?P<value>[a-zA-Z0-9:-]+)
| (?P<times>\*)
| (?P<divided>/)
| (?P<comma>,)
| (?P<whitespace>\s+)
""", re.VERBOSE)

class TokenType(enum.Enum):
    LPAREN = enum.auto()
    RPAREN = enum.auto()
    VALUE = enum.auto()
    PLUS = enum.auto()
    MINUS = enum.auto()
    TIMES = enum.auto()
    DIVIDED = enum.auto()
    COMMA = enum.auto()
    EOF = enum.auto()

class Token(NamedTuple):
    type: TokenType
    value: str

def tokenize(text):
    last = 0
    for match in LEXER.finditer(text):
        start, end = match.span()
        if start != last:
            bad_token = text[last:start]
            raise ParseError(f"Unknown token {bad_token!r}")
        last = end
        values = [
            (k, v)
            for k, v in match.groupdict().items()
            if v
        ]
        assert len(values) == 1
        (groupname, value) = values[0]
        if groupname != 'whitespace':
            yield Token(getattr(TokenType, groupname.upper()), value)

class Parser:
    """Recursive-descent formula parser."""
    def __init__(self, token_iter):
        self.token_iter = token_iter
        self.cur = next(self.token_iter)
    def parse(self):
        return self.toplevel()
    def consume(self, type):
        """If the current token is of the given type, consume and return it.

        Else return None."""
        cur = self.cur
        if cur.type == type:
            try:
                self.cur = next(self.token_iter)
            except StopIteration:
                self.cur = Token(TokenType.EOF, '')
            return cur
        return None
    def expect(self, type):
        if not self.consume(type):
            raise ParseError(f"Expected {type}, got {self.cur.type}")
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
                args = self.arglist()
                self.expect(TokenType.RPAREN)
                return [tm.value] + args
            return tm.value
        if self.consume(TokenType.LPAREN):
            tm = self.expr()
            self.expect(TokenType.RPAREN)
            return tm
        raise ParseError(f"Expected value or lparen, got {self.cur}")
    def arglist(self):
        tm = [self.expr()]
        while self.consume(TokenType.COMMA):
            tm = tm + self.arglist()
        return tm

class ParseError(Exception):
    pass
