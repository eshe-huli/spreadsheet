import ast

def parse(formula):
    """Parse a formula like `=A1+2+ABS(A2)`.

    Returns a set of nested lists:

    - The first element of the list is the name of the function or binary
      operation to apply
    - Each subsequent element is a string (= cell reference) or an integer (=
      a literal int)
    """
    pyast = ast.parse(formula, mode='eval')
    body = pyast.body
    return _pyast_to_myast(body)

class ParseError(Exception):
    pass

def _pyast_to_myast(node):
    if isinstance(node, ast.Num):
        return node.n
    elif isinstance(node, ast.BinOp):
        op_name = OPNAMES_BY_TYPE.get(type(node.op))
        if op_name is None:
            raise ParseError("Syntax error")
        return [
            op_name,
            _pyast_to_myast(node.left),
            _pyast_to_myast(node.right)
        ]
    elif isinstance(node, ast.Name):
        return node.id
    elif isinstance(node, ast.Call):
        if not isinstance(node.func, ast.Name):
            raise ParseError("Invalid function call")
        if node.keywords:
            raise ParseError("Syntax error")
        func = node.func.id
        return [func] + [_pyast_to_myast(arg) for arg in node.args]
    else:
        raise ParseError("Syntax error")

OPNAMES_BY_TYPE = {
    ast.Add: '+',
    ast.Sub: '-',
    ast.Mult: '*',
    ast.Div: '/'
}
