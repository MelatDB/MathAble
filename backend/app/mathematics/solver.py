"""Solver orchestration.

This module parses the raw user input, classifies the mathematical problem,
and dispatches to the correct step generator.  It also understands a small
set of natural-language phrasings used with voice input:

    solve 2x + 5 = 15
    derivative of x squared
    differentiate x^2
    integrate x^2
    simplify (x+1)^2
    factor x^2 - 9
    15 percent of 200
"""
import re

import sympy as sp
from sympy.printing.mathml import mathml

from app.mathematics.notation import normalise, split_statements
from app.mathematics.speech_to_expression import words_to_expression
from app.mathematics.steps import (
    Step,
    arithmetic_steps,
    derivative_steps,
    expression_steps,
    integral_steps,
    linear_steps,
    quadratic_steps,
    rationalize,
    simultaneous_steps,
    specific_operation_steps,
)
from app.mathematics.spoken import equation_spoken, to_spoken

# ---------------------------------------------------------------------------
# Domain errors with student-friendly messages.
# ---------------------------------------------------------------------------

MSG_INVALID = "I could not understand this mathematical expression. Please check your input."
MSG_EMPTY = "Please enter a mathematical expression."
MSG_UNSUPPORTED = (
    "This type of problem is not supported yet. Please try an equation, "
    "an arithmetic expression, a simplification, a derivative or an integral."
)
MSG_DIV_ZERO = "This expression involves division by zero and cannot be evaluated."


class InvalidExpression(Exception):
    """Raised when the user input cannot be interpreted."""


class UnsupportedExpression(Exception):
    """Raised for valid mathematics MathAble cannot handle yet."""


def _unwrap_natural_language(raw: str) -> tuple[str, str]:
    """Strip leading operation words such as 'solve'/'differentiate'.

    Returns (expression, operation) where operation is one of
    solve|derive|integrate|simplify|expand|factor|percent|"" (auto).
    """
    text = raw.strip().lower() if isinstance(raw, str) else ""

    match = re.match(r"^(?:please\s+)?(\w+)(?:\s+of\s+|\s+)(.+)$", text, re.S)
    if match:
        word = match.group(1)
        rest = match.group(2).strip()
        map_decided = {
            "solve": "solve",
            "differentiate": "derive",
            "derivative": "derive",
            "diff": "derive",
            "integrate": "integrate",
            "integral": "integrate",
            "simplify": "simplify",
            "factor": "factor",
            "expand": "expand",
        }
        if word in map_decided:
            return rest, map_decided[word]

    # Phrases without brackets: "derivative of x squared"
    m2 = re.match(r"^derivative\s+of\s+(.+)$", text, re.S)
    if m2:
        return m2.group(1), "derive"
    m3 = re.match(r"^integral\s+of\s+(.+)$", text, re.S)
    if m3:
        return m3.group(1), "integrate"

    return text, ""


def _detect_percent(text: str):
    """Recognise 'X% of Y' or 'X percent of Y'. Returns (X, Y) or None."""
    m = re.match(r"^\s*([\d.]+)\s*(?:%|percent|per cent)\s*(?:of)?\s*([\d.]+)\s*$", text, re.I)
    if m:
        return float(m.group(1)), float(m.group(2))
    return None


def process_percent(raw):
    percent, of = _detect_percent(raw)
    value = percent / 100 * of
    exact = sp.nsimplify(sp.Float(value, 12))
    steps = [
        Step(
            f"Convert {percent:g} percent to a decimal by dividing by 100.",
            math=f"{percent:g}% = {percent / 100:g}",
            spoken=f"{percent:g} percent equals {percent / 100:g}",
        ),
        Step(
            f"Multiply {of:g} by {percent / 100:g}.",
            expr=exact if exact.is_Number else sp.Float(value, 10),
        ),
    ]
    return {
        "input": raw,
        "interpreted": f"{percent:g}% of {of:g}",
        "expression_type": "percent",
        "steps": [s.as_dict() for s in steps],
        "answer": sp.sstr(exact) if exact.is_Number else sp.sstr(sp.Float(value, 10)),
        "answer_spoken": f"{percent:g} percent of {of:g} is {to_spoken(exact)}.",
        "answer_mathml": "",
        "message": "",
        "supported": True,
    }


ALLOWED_WORDS = {
    "sin", "cos", "tan", "asin", "acos", "atan", "sec", "csc", "cot",
    "log", "ln", "exp", "abs", "sqrt", "floor", "ceiling", "pi", "e",
}


def _looks_like_english_words(cleaned: str) -> bool:
    """Reject inputs that are ordinary sentences, not mathematics.

    Mathematic input uses single-letter variables, numbers, operators and a
    tiny set of known function names.  A run of alphabetic words longer than
    two characters (e.g. "hello world") is not mathematics.
    """
    tokens = re.split(r"[^a-zA-Z]+", cleaned)
    for token in tokens:
        if not token:
            continue
        if len(token) > 2 and token.lower() not in ALLOWED_WORDS:
            return True
    return False


def _parse_side(text: str):
    """Parse one side of an equation (or an expression).

    Numeric-only expressions are parsed unevaluated and then *rationalised*
    so that step generation can work with fractions like 3/4.  Expressions
    that contain unknown symbols are parsed fully evaluated, which is what
    the equation solvers need.
    """
    cleaned = normalise(text)
    if not cleaned:
        raise InvalidExpression(MSG_EMPTY)
    if _looks_like_english_words(cleaned):
        raise InvalidExpression(MSG_INVALID)
    try:
        local = {"pi": sp.pi, "e": sp.E, "I": sp.I}
        raw_expr = sp.sympify(cleaned, locals=local, evaluate=False)
    except (sp.SympifyError, SyntaxError, TypeError, ValueError) as exc:
        raise InvalidExpression(MSG_INVALID) from exc

    if raw_expr.free_symbols:
        try:
            return sp.sympify(cleaned, locals=local, evaluate=True)
        except (sp.SympifyError, SyntaxError, TypeError, ValueError) as exc:
            raise InvalidExpression(MSG_INVALID) from exc

    return rationalize(raw_expr)


def _get_symbols(expr) -> list[sp.Symbol]:
    """Free symbols of an expression, in deterministic order."""
    return sorted(expr.free_symbols, key=lambda s: s.name)


def _pretty_eq(eq) -> str:
    """Render an Eq as 'lhs = rhs' instead of SymPy's Eq(...) form."""
    if isinstance(eq, sp.Eq):
        return f"{sp.sstr(eq.lhs)} = {sp.sstr(eq.rhs)}"
    return sp.sstr(eq)


def _process_equation(raw, operation):
    """Solve a single equation such as '2x + 5 = 15'."""
    parts = raw.split("=", 1)
    if len(parts) != 2:
        raise InvalidExpression(MSG_INVALID)
    lhs_raw, rhs_raw = parts[0].strip(), parts[1].strip()
    if not lhs_raw or not rhs_raw:
        raise InvalidExpression(MSG_INVALID)

    lhs = _parse_side(lhs_raw)
    rhs = _parse_side(rhs_raw)
    expr_diff = sp.simplify(lhs - rhs)
    symbols = _get_symbols(expr_diff)

    if not symbols:
        # A numeric equation like '3 = 3' or '5 = 7'.
        result = sp.simplify(lhs - rhs)
        steps = [Step("This is a numeric statement.", expr=sp.Eq(lhs, rhs))]
        if result == 0:
            steps.append(Step("The statement is true.", expr=sp.Eq(0, 0)))
            answer = "The statement is true."
        else:
            steps.append(Step("The statement is false.", expr=sp.Eq(0, sp.simplify(result))))
            answer = "The statement is false."
        return _build_result(raw, lhs_raw + " = " + rhs_raw, "equation",
                             [s.as_dict() for s in steps], answer,
                             equation_spoken(sp.Eq(lhs, rhs)), "", "")

    if len(symbols) > 1:
        solution = sp.solve(sp.Eq(lhs, rhs), symbols, dict=True)
        steps = [
            Step("Solve the equation for all variables.",
                 expr=sp.Eq(lhs, rhs)),
        ]
        if not solution:
            return _build_result(raw, _pretty_eq(sp.Eq(lhs, rhs)), "equation",
                                 [s.as_dict() for s in steps], "No solution.",
                                 "No solution.", "", "")
        ans = ", ".join(f"{k} = {v}" for k, v in solution[0].items())
        for var, val in solution[0].items():
            steps.append(Step(
                f"The value of {var.name} is {to_spoken(val)}.",
                expr=sp.Eq(var, val),
            ))
        return _build_result(raw, _pretty_eq(sp.Eq(lhs, rhs)), "equation",
                             [s.as_dict() for s in steps], ans,
                             ", ".join(f"{k} equals {to_spoken(v)}"
                                       for k, v in solution[0].items()), "", "")

    var = symbols[0]
    degree = _polynomial_degree(expr_diff, var)

    if degree == 1:
        steps, answer = linear_steps(expr_diff, var)
        if isinstance(answer, str):
            return _build_result(
                raw, _pretty_eq(sp.Eq(lhs, rhs)), "equation",
                [s.as_dict() for s in steps], answer, answer, "", "")
        answer_text = f"{var.name} = {sp.sstr(answer)}"
        answer_spoken = f"{var.name} equals {to_spoken(answer)}"
        return _build_result(
            raw, _pretty_eq(sp.Eq(lhs, rhs)), "equation",
            [s.as_dict() for s in steps], answer_text, answer_spoken,
            _try_mathml(sp.Eq(var, answer)), "")

    if degree == 2:
        steps, roots, note = quadratic_steps(expr_diff, var)
        if len(roots) == 1:
            answer_text = f"{var.name} = {sp.sstr(roots[0])} (repeated root)"
            answer_spoken = (f"{var.name} equals {to_spoken(roots[0])}. "
                             "This is a repeated root.")
            answer_mathml = _try_mathml(sp.Eq(var, roots[0]))
        else:
            answer_text = " or ".join(
                f"{var.name} = {sp.sstr(r)}" for r in roots
            )
            answer_spoken = " or ".join(
                f"{var.name} equals {to_spoken(r)}" for r in roots
            )
            answer_mathml = _try_mathml(
                sp.Or(*[sp.Eq(var, r) for r in roots])
            )
        interpreted = _pretty_eq(sp.Eq(lhs, rhs))
        if note:
            steps.append(Step(note))
        return _build_result(raw, interpreted, "equation",
                             [s.as_dict() for s in steps],
                             answer_text, answer_spoken, answer_mathml, "")

    # General polynomial or other equation: rely on SymPy.
    solution = sp.solve(sp.Eq(lhs, rhs), var)
    steps = [Step("Solve the equation.", expr=sp.Eq(lhs, rhs))]
    if not solution:
        return _build_result(raw, _pretty_eq(sp.Eq(lhs, rhs)), "equation",
                             [s.as_dict() for s in steps],
                             "No solution found in the supported range.",
                             "No solution was found.", "", "")
    if len(solution) == 1:
        answer = sp.Eq(var, solution[0])
        steps.append(Step("The solution is:", expr=answer))
        answer_text = f"{var.name} = {sp.sstr(solution[0])}"
        answer_spoken = f"{var.name} equals {to_spoken(solution[0])}"
    else:
        answer = sp.And(*[sp.Eq(var, s) for s in solution])
        for s in solution:
            steps.append(Step("A solution is:", expr=sp.Eq(var, s)))
        answer_text = " or ".join(f"{var.name} = {sp.sstr(s)}"
                                  for s in solution)
        answer_spoken = " or ".join(f"{var.name} equals {to_spoken(s)}"
                                    for s in solution)

    return _build_result(raw, _pretty_eq(sp.Eq(lhs, rhs)), "equation",
                         [s.as_dict() for s in steps],
                         answer_text, answer_spoken,
                         _try_mathml(answer), "")


def _polynomial_degree(expr_diff, var) -> int:
    try:
        return int(sp.degree(sp.expand(expr_diff), var))
    except Exception:  # pragma: no cover - not a polynomial
        return 0


def _format_answer(answer):
    if isinstance(answer, str):
        return answer
    return sp.sstr(answer)


def _spoken_answer(answer, var):
    if isinstance(answer, str):
        return answer
    if isinstance(answer, sp.And):
        return ", and ".join(equation_spoken(a) for a in answer.args)
    return equation_spoken(answer)


def _mathml_for(answer, var=None):
    try:
        if isinstance(answer, str):
            return ""
        return mathml(answer, printer="presentation")
    except Exception:  # pragma: no cover
        return ""


def _process_system(raw):
    """Handle 'eq1; eq2' and 'eq1 and eq2' style simultaneous equations."""
    statements = split_statements(raw)
    equations = []
    symbols = set()

    for statement in statements:
        if "=" not in statement:
            raise InvalidExpression(MSG_INVALID)
        lhs_raw, _, rhs_raw = statement.partition("=")
        lhs = _parse_side(lhs_raw)
        rhs = _parse_side(rhs_raw)
        equations.append(sp.Eq(lhs, rhs))
        symbols.update(lhs.free_symbols | rhs.free_symbols)

    if len(equations) < 2:
        # Only one statement given; fall through to the single-equation path.
        return None

    symbol_list = sorted(symbols, key=lambda s: s.name)
    steps, solution = simultaneous_steps(equations, symbol_list)

    interpreted = "; ".join(sp.sstr(e) for e in equations)
    if solution is None:
        return _build_result(raw, interpreted, "system",
                             [s.as_dict() for s in steps],
                             "No solution.", "This system has no solution.",
                             "", "")
    if isinstance(solution, dict):
        answer_text = ", ".join(f"{k} = {v}" for k, v in solution.items())
        answer_spoken = ", and ".join(
            f"{k} equals {to_spoken(v)}" for k, v in solution.items())
        answer_expr = sp.And(*[sp.Eq(k, v) for k, v in solution.items()])
    else:
        answer_text = sp.sstr(solution)
        answer_spoken = to_spoken(solution) or answer_text
        answer_expr = solution
    return _build_result(raw, interpreted, "system",
                         [s.as_dict() for s in steps], answer_text,
                         answer_spoken,
                         _try_mathml(answer_expr), "")


def _process_expression(raw, operation):
    """Handle a single expression (no '=' sign)."""
    expr = _parse_side(raw)
    symbols = _get_symbols(expr)

    # Calculus on an expression with a variable.
    if operation == "derive":
        if not symbols:
            raise InvalidExpression(
                "A derivative needs a variable, for example derivative of x squared.")
        var = symbols[0]
        steps, deriv = derivative_steps(expr, var)
        return _build_result(raw, sp.sstr(expr), "derivative",
                             [s.as_dict() for s in steps],
                             sp.sstr(deriv), to_spoken(deriv),
                             _try_mathml(deriv), "")

    if operation == "integrate":
        if not symbols:
            raise InvalidExpression(
                "An integral needs a variable, for example integrate x squared.")
        var = symbols[0]
        steps, integral = integral_steps(expr, var)
        return _build_result(raw, sp.sstr(expr), "integral",
                             [s.as_dict() for s in steps],
                             sp.sstr(integral) + " + C",
                             to_spoken(integral) + ", plus C, the constant of integration",
                             _try_mathml(integral), "")

    if operation in ("simplify", "expand", "factor"):
        steps, result = specific_operation_steps(operation, expr)
        return _build_result(raw, sp.sstr(expr), operation,
                             [s.as_dict() for s in steps],
                             sp.sstr(result), to_spoken(result),
                             _try_mathml(result), "")

    if not symbols:
        # Pure numeric expression.
        steps, value = arithmetic_steps(expr)
        if expr.has(sp.zoo) or expr.has(sp.oo):
            raise UnsupportedExpression(MSG_DIV_ZERO)
        return _build_result(raw, sp.sstr(expr), "arithmetic",
                             [s.as_dict() for s in steps],
                             sp.sstr(value), to_spoken(value),
                             _try_mathml(value), "")

    # Generic expression with unknowns: show equivalent forms.
    steps, simplified = expression_steps(expr)
    return _build_result(raw, sp.sstr(expr), "expression",
                         [s.as_dict() for s in steps],
                         sp.sstr(simplified), to_spoken(simplified),
                         _try_mathml(simplified), "")


def _build_result(raw, interpreted, expression_type, steps, answer_text,
                  answer_spoken, answer_mathml, message,
                  supported: bool = True):
    return {
        "input": raw,
        "interpreted": interpreted,
        "expression_type": expression_type,
        "steps": steps,
        "answer": answer_text,
        "answer_spoken": answer_spoken,
        "answer_mathml": answer_mathml,
        "supported": supported,
        "message": message,
    }


def _try_mathml(expr):
    try:
        return mathml(expr, printer="presentation")
    except Exception:  # pragma: no cover
        return ""


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def process_expression(raw: str) -> dict:
    """Process a raw mathematical problem and return the full result dict.

    Raises InvalidExpression for unparseable input and UnsupportedExpression
    for valid mathematics that the engine cannot solve reliably.
    """
    if raw is None or not raw.strip():
        raise InvalidExpression(MSG_EMPTY)

    work = raw.strip()
    expression, operation = _unwrap_natural_language(work)

    # A denominator of zero can never be evaluated safely.
    if re.search(r"/\s*0(?![0-9.])", normalise(work)):
        raise UnsupportedExpression(MSG_DIV_ZERO)

    # Voice input: convert spoken words to symbolic notation when present.
    converted = words_to_expression(expression)
    if converted is not None and converted != expression:
        expression = converted
    work = expression.strip()

    # Percentages, e.g. "15% of 200" or "15 percent of 200".
    if _detect_percent(work) is not None:
        return process_percent(work)

    statements = split_statements(work)

    # Multiple statements -> simultaneous equations.
    if len(statements) > 1 and all("=" in s for s in statements):
        result = _process_system(work)
        if result is not None:
            return result

    # Single equation.
    if "=" in work:
        return _process_equation(work, operation)

    # Plain expression / arithmetic / calculus / explicit operation.
    return _process_expression(work, operation)