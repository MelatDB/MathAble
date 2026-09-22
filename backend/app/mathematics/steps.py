"""Step-by-step solution generators.

Every generator works on the actual SymPy objects produced from the user's
input.  It never fabricates steps: each step is an expression that SymPy
computed, and the final answer is the result of solving that expression.

Each generator returns ``(steps, answer)`` where ``answer`` is the SymPy
value (or a plain-language string for special cases such as "No solution").
"""
import sympy as sp
from sympy.printing.mathml import mathml

from app.mathematics.spoken import equation_spoken, to_spoken


class Step:
    """A single solution step with math, spoken description and MathML."""

    def __init__(self, title: str, expr=None, math: str = "", spoken: str = ""):
        self.title = title
        if expr is not None:
            if isinstance(expr, str):
                self.math = expr
                self.spoken = spoken or equation_spoken(expr)
                self.mathml = ""
            else:
                self.math = sp.sstr(expr)
                self.spoken = spoken or equation_spoken(expr)
                self.mathml = mathml(expr, printer="presentation")
        else:
            self.math = math
            self.spoken = spoken
            self.mathml = ""

    def as_dict(self) -> dict:
        return {
            "title": self.title,
            "math": self.math,
            "spoken": self.spoken,
            "mathml": self.mathml,
        }


# ---------------------------------------------------------------------------
# Linear equations: a x + b = 0
# ---------------------------------------------------------------------------

def linear_steps(expr_diff, var: sp.Symbol):
    """Steps for a single-variable linear equation given lhs - rhs = 0."""
    steps = []
    standard = sp.expand(expr_diff)
    coeffs = sp.Poly(standard, var).all_coeffs()
    a, b = sp.simplify(coeffs[0]), sp.simplify(coeffs[1])

    if a == 0:
        if b == 0:
            steps.append(Step(
                "The equation simplifies to a statement that is always true.",
                expr=sp.Eq(0, 0),
            ))
            return steps, "Every real number is a solution."
        steps.append(Step(
            "The equation simplifies to a statement that is never true.",
            expr=sp.Eq(0, -b),
        ))
        return steps, "No solution."

    steps.append(Step(
        "Write the equation in the standard form a x plus b equals zero.",
        expr=sp.Eq(standard, 0),
    ))

    steps.append(Step(
        "Move the constant term to the right side of the equation.",
        expr=sp.Eq(a * var, -b),
    ))

    solution = sp.simplify(-b / a)
    steps.append(Step(
        f"Divide both sides by the coefficient of {var.name}, which is "
        f"{to_spoken(a)}.",
        expr=sp.Eq(var, solution),
    ))

    return steps, solution


# ---------------------------------------------------------------------------
# Quadratic equations: a x^2 + b x + c = 0
# ---------------------------------------------------------------------------

def quadratic_steps(expr_diff, var: sp.Symbol):
    """Steps for a quadratic equation. Returns (steps, roots, note)."""
    steps = []
    standard = sp.expand(expr_diff)
    a, b, c = (sp.simplify(v) for v in sp.Poly(standard, var).all_coeffs())

    note = ""
    steps.append(Step(
        "Write the equation in the standard quadratic form: "
        "a x squared plus b x plus c equals zero.",
        expr=sp.Eq(standard, 0),
    ))
    steps.append(Step(
        "Identify the coefficients a, b and c.",
        math=f"a = {a}, b = {b}, c = {c}",
        spoken=f"a equals {to_spoken(a)}, b equals {to_spoken(b)} and "
               f"c equals {to_spoken(c)}.",
    ))

    disc = sp.simplify(b ** 2 - 4 * a * c)
    steps.append(Step(
        "Calculate the discriminant, D equals b squared minus four a c.",
        math=f"D = {sp.sstr(disc)}",
        spoken=f"D equals {to_spoken(disc)}.",
    ))

    if disc.is_Number and float(sp.N(disc, 8)) < 0:
        note = ("The discriminant is negative, so the equation has no real "
                "solutions. The two roots are complex numbers.")
        steps.append(Step(note, math=f"D = {sp.sstr(disc)} < 0",
                          spoken=note))
    else:
        steps.append(Step(
            "The discriminant is zero or positive, so the equation has real "
            "solutions.",
        ))

    steps.append(Step(
        "Apply the quadratic formula: x equals minus b plus or minus the "
        "square root of D, all over two a.",
        math=f"x = (-b ± sqrt(D)) / (2a)",
        spoken="x equals minus b, plus or minus the square root of D, "
               "all over two a.",
    ))

    roots = sp.solve(sp.Eq(standard, 0), var)
    if not roots:
        roots = sp.solve(sp.Eq(standard, 0), var, check=False)

    if len(roots) == 1:
        steps.append(Step(
            "The two roots are equal (a repeated root).",
            expr=sp.Eq(var, roots[0]),
        ))
    else:
        for idx, root in enumerate(roots, start=1):
            steps.append(Step(
                f"Root {idx}.",
                expr=sp.Eq(var, root),
            ))

    return steps, roots, note


# ---------------------------------------------------------------------------
# Simultaneous linear equations
# ---------------------------------------------------------------------------

def _system_math(equations) -> str:
    """'eq1; eq2' formatting for a system of equations."""
    return "; ".join(f"{sp.sstr(e.lhs)} = {sp.sstr(e.rhs)}" for e in equations)


def simultaneous_steps(equations: list[sp.Eq], symbols: list[sp.Symbol]):
    """Steps for a linear system. Returns (steps, solution_dict or None)."""
    steps = []
    steps.append(Step(
        "This is a system of simultaneous equations. Solve them together.",
        math=_system_math(equations),
        spoken="; ".join(equation_spoken(e) for e in equations),
    ))

    if len(equations) == 2 and len(symbols) == 2:
        elim = _eliminate(equations, symbols)
        if elim is not None:
            steps.extend(elim["steps"])
            steps.append(Step(
                "Substitute this value into the first equation to find the "
                "remaining variable.",
            ))
            solution = elim["solution"]
            for var, val in solution.items():
                steps.append(Step(
                    f"The value of {var.name} is {to_spoken(val)}.",
                    expr=sp.Eq(var, val),
                ))
            return steps, solution

    steps.append(Step("Solve the system using algebraic elimination."))
    solution = sp.solve(equations, symbols, dict=True)
    if not solution:
        return steps, None
    solution = solution[0]
    for var, val in solution.items():
        steps.append(Step(
            f"The value of {var.name} is {to_spoken(val)}.",
            expr=sp.Eq(var, val),
        ))
    return steps, solution


def _eliminate(equations, symbols):
    """Designed for two linear equations with integer coefficients.

    Returns a dict with steps plus the solved values, or None when the
    method cannot be applied safely.
    """
    var1, var2 = symbols
    eqs = []
    for eqi in equations:
        poly = sp.Poly(sp.expand(eqi.lhs - eqi.rhs), var1, var2)
        # a x + b y + c = 0 coefficients via monomial lookup.
        a = poly.coeff_monomial(var1)
        b = poly.coeff_monomial(var2)
        c = poly.coeff_monomial(sp.S.One)
        eqs.append((sp.simplify(a), sp.simplify(b), sp.simplify(c)))

    a1, b1, c1 = eqs[0]
    a2, b2, c2 = eqs[1]

    if not all(v.is_integer for v in (a1, b1, c1, a2, b2, c2)):
        return None

    lcm_a = abs(int(sp.lcm(a1, a2)))
    if lcm_a == 0:
        return None

    m1 = abs(lcm_a // int(a1)) if a1 else 0
    m2 = abs(lcm_a // int(a2)) if a2 else 0

    steps = []
    steps.append(Step(
        f"Multiply the first equation by {int(m1)} and the second by "
        f"{int(m2)} so that the coefficients of {var1.name} match.",
        math=_system_math(equations),
        spoken="; ".join(equation_spoken(e) for e in equations),
    ))

    e1n = sp.Eq(sp.expand(m1 * equations[0].lhs),
                sp.expand(m1 * equations[0].rhs))
    e2n = sp.Eq(sp.expand(m2 * equations[1].lhs),
                sp.expand(m2 * equations[1].rhs))
    steps.append(Step(
        "The multiplied equations are:",
        math=_system_math([e1n, e2n]),
        spoken="; ".join(equation_spoken(e) for e in (e1n, e2n)),
    ))

    # Subtract (or add, depending on signs) to eliminate var1.
    difference = sp.expand((e1n.lhs - e2n.lhs) - (e1n.rhs - e2n.rhs))
    if difference.has(var1):
        e2n = sp.Eq(sp.expand(-m2 * equations[1].lhs),
                    sp.expand(-m2 * equations[1].rhs))
        difference = sp.expand((e1n.lhs + e2n.lhs) - (e1n.rhs + e2n.rhs))

    combined_eq = sp.Eq(difference, 0)
    steps.append(Step(
        f"Combine the equations to eliminate {var1.name}, leaving an "
        f"equation in {var2.name} only.",
        math=f"{sp.sstr(combined_eq.lhs)} = {sp.sstr(combined_eq.rhs)}",
        spoken=equation_spoken(combined_eq),
    ))

    val2_solutions = sp.solve(combined_eq, var2)
    if not val2_solutions:
        return None
    val2 = sp.simplify(val2_solutions[0])
    steps.append(Step(
        f"Solve this equation for {var2.name}.",
        expr=sp.Eq(var2, val2),
    ))

    val1_solutions = sp.solve(
        equations[0].subs(var2, val2), var1
    )
    if not val1_solutions:
        return None
    val1 = sp.simplify(val1_solutions[0])
    return {"steps": steps, "solution": {var1: val1, var2: val2}}


# ---------------------------------------------------------------------------
# Arithmetic expressions
# ---------------------------------------------------------------------------

def arithmetic_steps(expr):
    """Steps for a numeric expression (no unknown symbols).

    ``expr`` should already be *rationalised* (fractions such as ``3/4`` are
    Rational objects rather than unevaluated ``Mul(3, Pow(4, -1))``).
    """
    steps = []
    value = _evaluate_numeric(expr)

    if isinstance(expr, sp.Add) and all(isinstance(a, sp.Rational)
                                        for a in expr.args):
        from sympy import lcm
        dens = [a.q for a in expr.args]
        common = lcm(*dens)
        steps.append(Step(
            "Find the least common multiple of the denominators.",
            math=f"LCM = {common}",
            spoken=f"the least common multiple of the denominators is "
                   f"{to_spoken(common)}",
        ))
        rewritten = [f"{a.p * (common // a.q)}/{common}" for a in expr.args]
        spoken_rewritten = [
            f"{to_spoken(a)}" if common // a.q == 1
            else _frac_phrase(a.p * (common // a.q), common)
            for a in expr.args
        ]
        steps.append(Step(
            "Rewrite each fraction with the common denominator.",
            math=" + ".join(rewritten),
            spoken=", plus ".join(spoken_rewritten),
        ))
        combined = sp.Rational(
            sum(a.p * (common // a.q) for a in expr.args), common
        )
        steps.append(Step("Add the numerators.", expr=combined))
        if combined != value:
            steps.append(Step("Simplify the result.", expr=value))
        return steps, value

    if isinstance(expr, sp.Mul) and all(isinstance(a, sp.Rational)
                                        for a in expr.args):
        numerator = 1
        denominator = 1
        for a in expr.args:
            numerator *= a.p
            denominator *= a.q
        shown = " * ".join(f"{a.p}/{a.q}" for a in expr.args)
        steps.append(Step(
            "Multiply the numerators and the denominators.",
            math=shown,
            spoken=shown.replace(" * ", " times "),
        ))
        prod = sp.Rational(numerator, denominator)
        if prod != value:
            steps.append(Step("Simplified, the result is:", expr=value))
        else:
            steps.append(Step("The result is:", expr=value))
        return steps, value

    if isinstance(expr, sp.Pow):
        base, exp = expr.args
        if exp == sp.Rational(1, 2):
            steps.append(Step(
                f"Calculate the square root of {to_spoken(base)}.",
                expr=value,
            ))
            return steps, value
        if isinstance(exp, sp.Integer) and isinstance(base, sp.Rational):
            steps.append(Step(
                f"Calculate {to_spoken(base)} raised to the power "
                f"{int(exp)}.",
                expr=value,
            ))
            return steps, value

    if isinstance(expr, (sp.Integer, sp.Rational)):
        steps.append(Step(
            "The expression is already a single value.",
            expr=value,
        ))
        return steps, value

    steps.append(Step(
        "Evaluate the arithmetic expression.",
        expr=value,
    ))
    return steps, value


def _evaluate_numeric(expr):
    """Exact value of a numeric expression, falling back to a decimal."""
    try:
        exact = sp.nsimplify(sp.expand(expr))
        if exact.is_Number:
            return exact
    except Exception:  # pragma: no cover
        pass
    return sp.N(expr, 10)


def _frac_phrase(numer: int, den: int) -> str:
    """Spoken phrase for a (possibly non-reduced) fraction such as 8/12."""
    from app.mathematics.spoken import fraction_words
    return fraction_words(numer, den)


def rationalize(expr):
    """Rewrite an unevaluated expression such as ``Mul(3, Pow(4, -1))`` so
    that numeric fractions become explicit Rational objects.

    The outer structure (which terms were added together) is preserved;
    the rational values inside are reduced.  Expressions with symbols are
    returned unchanged.
    """
    if expr.free_symbols:
        return expr

    if isinstance(expr, sp.Add):
        args = [rationalize(a) for a in expr.args]
        return sp.Add(*args, evaluate=False)

    if isinstance(expr, sp.Mul):
        numerator = 1
        denominator = 1
        rest = []
        for f in expr.args:
            if isinstance(f, sp.Pow) and f.exp == -1 and f.base.is_Integer:
                denominator *= int(f.base)
            elif f.is_Integer:
                numerator *= int(f)
            elif isinstance(f, sp.Rational):
                numerator *= int(f.p)
                denominator *= int(f.q)
            elif isinstance(f, sp.Float):
                rest.append(f)
            elif isinstance(f, sp.Pow) and f.exp.is_Integer \
                    and f.exp > 0 and f.base.is_Integer:
                numerator *= int(f)
            else:
                rest.append(f)
        if denominator != 1:
            fraction = sp.Rational(numerator, denominator)
            return fraction if not rest else sp.Mul(fraction, *rest)
        if not rest:
            return sp.Integer(numerator)
        return sp.Mul(sp.Integer(numerator), *rest, evaluate=False)

    if isinstance(expr, sp.Pow) and expr.exp == -1 and expr.base.is_Integer:
        return sp.Rational(1, int(expr.base))

    return expr


# ---------------------------------------------------------------------------
# Expressions with unknowns: simplify / expand / factor
# ---------------------------------------------------------------------------

def expression_steps(expr):
    """Show useful equivalent forms of an expression with unknowns."""
    steps = []
    simplified = sp.nsimplify(sp.simplify(expr))
    expanded = sp.expand(expr)
    factored = sp.factor(expr)

    if expr != simplified:
        steps.append(Step("Simplify the expression.", expr=simplified))
    if expanded != expr and expanded != simplified:
        steps.append(Step("Expanded form.", expr=expanded))
    if (factored not in (expr, expanded, simplified)
            and not isinstance(factored, sp.Add)):
        steps.append(Step("Factored form.", expr=factored))

    if not steps:
        steps.append(Step(
            "This expression is already in its simplest form.",
            expr=expr,
        ))
    return steps, simplified


def specific_operation_steps(operation: str, expr):
    """Explicit simplify / expand / factor requested by the user."""
    steps = []
    if operation == "expand":
        result = sp.expand(expr)
        steps.append(Step(
            "Expand the expression by removing the brackets.",
            expr=result,
        ))
    elif operation == "factor":
        result = sp.factor(expr)
        steps.append(Step("Factor the expression.", expr=result))
    else:
        result = sp.nsimplify(sp.simplify(expr))
        steps.append(Step("Simplify the expression.", expr=result))
    return steps, result


# ---------------------------------------------------------------------------
# Calculus
# ---------------------------------------------------------------------------

def derivative_steps(expr, var):
    """Differentiation, with per-term power rule steps for polynomials."""
    steps = []
    deriv = sp.diff(expr, var)

    if expr.is_Add:
        for term in expr.args:
            dterm = sp.diff(term, var)
            if term.is_Number or term is var:
                steps.append(Step(
                    f"The derivative of {sp.sstr(term)} is {sp.sstr(dterm)}.",
                    expr=dterm,
                ))
            elif term.is_Pow and term.args[1].is_integer:
                steps.append(Step(
                    f"Power rule: the derivative of {sp.sstr(term)} is "
                    f"{sp.sstr(dterm)}.",
                    expr=dterm,
                ))
            elif term.is_Mul or term.is_Symbol:
                steps.append(Step(
                    f"Constant multiple rule: the derivative of "
                    f"{sp.sstr(term)} is {sp.sstr(dterm)}.",
                    expr=dterm,
                ))
            else:
                steps.append(Step(
                    f"Differentiate {sp.sstr(term)}.",
                    expr=dterm,
                ))
        steps.append(Step("Add the results together.", expr=deriv))
    else:
        steps.append(Step(
            "Apply the standard rules of differentiation.",
            expr=deriv,
        ))

    steps.append(Step(
        "Final answer: the derivative is the expression above.",
        expr=deriv,
    ))
    return steps, deriv


def integral_steps(expr, var):
    """Indefinite integration, with per-term power rule steps where possible."""
    steps = []
    integral = sp.integrate(expr, var)

    if expr.is_Add:
        for term in expr.args:
            iterm = sp.integrate(term, var)
            steps.append(Step(
                f"The antiderivative of {sp.sstr(term)} is {sp.sstr(iterm)}.",
                expr=iterm,
            ))
        steps.append(Step("Add the results together.", expr=integral))
    else:
        steps.append(Step(
            "Apply the standard rules of integration.",
            expr=integral,
        ))

    steps.append(Step(
        "Add the constant of integration, C.",
        math=f"{sp.sstr(integral)} + C",
        spoken=f"{to_spoken(integral)}, plus C, the constant of integration",
    ))
    steps.append(Step("The final answer is the integral above.", expr=integral))
    return steps, integral