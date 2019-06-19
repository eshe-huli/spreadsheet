/**
 * Parse a formula.
 *
 * @returns
 *     a string for references/literals; for binary operators or function
 *     calls, it will return a list whose first element is the operator and
 *     whose second and third elements are the operands.
 *
 * @throws {formula.ParseError} if the formula is syntactically invalid.
 *
 * @example
 * parse('A1') // => 'A1'
 * parse('2018-01-01') // => '2018-01-01'
 * parse('6.02e23') // => '6.02e23'
 * parse("miscellaneousliteral") // => 'miscellaneousliteral'
 * parse('"string with spaces"') // => 'string with spaces'
 * parse('A1 + A2') // => ['+', 'A1', 'A2']
 * parse('-1 + 2') // => ['+', '-1', '2']
 * parse('2 + -1') // => ['+', '2', '-1']
 * parse('A1 - A2 - A3') // => ['-', ['-', 'A1', 'A2'], 'A3']
 * parse('A1 - (A2 - A3)') // => ['-', 'A1', ['-', 'A2', 'A3']]
 * parse('A1 + A2 * A3') // => ['+', 'A1', ['*', 'A2', 'A3']]
 * parse('sum(A1:A2)') // => ['sum', 'A1:A2']
 * parse('sum(A1:A2, A3, A4)') // => ['sum', 'A1:A2', 'A3', 'A4']
 * parse('sqrt((1+1))') // => ['sqrt', ['+', '1', '1']]
 * parse('A1 + sqrt(A2 + A3)') // => ['+', 'A1', ['sqrt', ['+', 'A2', 'A3']]]
 */
function parse(code) {
  return new Parser(tokenize(code)).parse();
}

/**
 * Error subclass indicating the parsing of a formula failed.
 */
class ParseError extends Error {
  constructor(message) {
    super(message);
    this.name = "ParseError";
  }
}

const LEXER = new RegExp(
  "(?<lparen>\\()" +
    "|(?<rparen>\\))" +
    "|(?<plus>\\+)" +
    "|(?<minus>- )" + // hack: minus must be followed by whitespace
    "|(?<value>[a-zA-Z0-9:\.-]+)" +
    '|(?<quoted>"[^"]+")' +
    "|(?<times>\\*)" +
    "|(?<divided>/)" +
    "|(?<comma>,)" +
    "|(?<whitespace>\\s+)",
  "g"
);

const FUNCTION_NAME = /^[a-zA-Z]+$/;

const TOKEN_TYPES = {
  lparen: "(",
  rparen: ")",
  plus: "+",
  minus: "-",
  value: "a literal value",
  quoted: "a quoted string",
  times: "*",
  divided: "/",
  comma: ",",
  whitespace: "whitespace",
  eof: "[end of string]"
};

/** Split up a text stream into tokens.
 *
 * Each token has the structure `{type, text}` where `type` is a key in
 * `TOKEN_TYPES` and `text` is the string that matched the token.
 *
 * @param {String} code the code to tokenize
 */
function* tokenize(code) {
  let m;
  let expectedNextToken = 0;
  LEXER.lastIndex = 0; // UGH this is terrible.
  while ((m = LEXER.exec(code)) != null) {
    if (m.index != expectedNextToken) {
      throw Error("Unexpected token " + code.charAt(expectedNextToken));
    }
    // Return a token for the non-empty matching group
    let type, text;
    for (let groupname in m.groups) {
      if (m.groups[groupname] != null) {
        type = groupname;
        text = m.groups[groupname];
        break;
      }
    }
    if (text == null) {
      throw new Error("All groups empty!");
    }
    yield { type, text };
    expectedNextToken += text.length;
  }
  if (expectedNextToken != code.length) {
    throw Error("Unexpected token end " + code.charAt(expectedNextToken));
  }
}

class Parser {
  constructor(tokenIter) {
    this.tokenIter = tokenIter;
    this.attemptedTypes = new Set();
    this.advance();
  }
  parse() {
    return this.toplevel();
  }
  // Move `self.cur` to the next token
  advance() {
    const next = this.tokenIter.next();
    this.attemptedTypes = new Set();
    if (next.done) {
      this.cur = { type: "eof", text: "" };
    } else {
      this.cur = next.value;
    }
    if (this.cur.type == "whitespace") {
      this.advance();
    }
  }
  consume(type) {
    let cur = this.cur;
    if (cur.type == type) {
      this.advance();
      return cur;
    }
    this.attemptedTypes.add(type);
    return null;
  }
  expect(type) {
    if (!this.consume(type)) {
      this.throwUnexpectedToken();
    }
  }
  throwUnexpectedToken() {
    let desc = [...this.attemptedTypes.values()]
      .map(type => TOKEN_TYPES[type])
      .join(", ");
    let got;
    if (this.cur.type == "eof") {
      got = TOKEN_TYPES.eof;
    } else {
      got = `'${this.cur.text}'`;
    }
    throw Error(`Expected one of: ${desc}; got ${got}`);
  }
  toplevel() {
    let tm = this.expr();
    this.expect("eof");
    return tm;
  }
  expr() {
    return this.sum();
  }
  sum() {
    let tm = this.summand();
    while (true) {
      if (this.consume("plus")) {
        tm = ["+", tm, this.summand()];
      } else if (this.consume("minus")) {
        tm = ["-", tm, this.summand()];
      } else {
        break;
      }
    }
    return tm;
  }
  summand() {
    let tm = this.factor();
    while (true) {
      if (this.consume("times")) {
        tm = ["*", tm, this.factor()];
      } else if (this.consume("divided")) {
        tm = ["/", tm, this.factor()];
      } else {
        break;
      }
    }
    return tm;
  }
  factor() {
    let tm = this.consume("value");
    if (tm != null) {
      // could be a function call
      if (this.consume("lparen")) {
        let name = tm.text;
        if (!FUNCTION_NAME.test(name)) {
          throw Error(`${name} is not a valid function name`);
        }
        let args = this.arglist();
        this.expect("rparen");
        args.splice(0, 0, name);
        return args;
      }
      return tm.text;
    }
    tm = this.consume("quoted");
    if (tm != null) {
      return tm.text.replace(/(^"|"$)/g, "");
    }
    if (this.consume("lparen")) {
      tm = this.expr();
      this.expect("rparen");
      return tm;
    }
    this.throwUnexpectedToken();
  }
  arglist() {
    let tm = [this.expr()];
    while (this.consume("comma")) {
      tm.push(this.expr());
    }
    return tm;
  }
}

module.exports = { tokenize, parse, ParseError };
