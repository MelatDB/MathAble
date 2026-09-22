"""Mathematics to natural-speech conversion.

A MathAble student who uses a screen reader should hear meaningful
mathematical language, not raw notation.  This module walks a SymPy
expression tree and produces a plain-language spoken description:

    x**2 + 5*x + 6  ->  "x squared plus five x plus six"
    Rational(3, 4)  ->  "three quarters"
    sqrt(25)        ->  "square root of twenty-five"
"""
import re

import sympy as sp

_ZERO = "zero"
_ONES = {
    1: "one", 2: "two", 3: "three", 4: "four", 5: "five", 6: "six", 7: "seven",
    8: "eight", 9: "nine", 10: "ten", 11: "eleven", 12: "twelve", 13: "thirteen",
    14: "fourteen", 15: "fifteen", 16: "sixteen", 17: "seventeen", 18: "eighteen",
    19: "nineteen",
}
_TENS = {
    2: "twenty", 3: "thirty", 4: "forty", 5: "fifty", 6: "sixty",
    7: "seventy", 8: "eighty", 9: "ninety",
}

# Fraction denominators as ordinal words.
_ORDINALS = {
    1: "whole", 2: "half", 3: "third", 4: "quarter", 5: "fifth", 6: "sixth",
    7: "seventh", 8: "eighth", 9: "ninth", 10: "tenth", 11: "eleventh",
    12: "twelfth", 13: "thirteenth", 14: "fourteenth", 15: "fifteenth",
    16: "sixteenth", 17: "seventeenth", 18: "eighteenth", 19: "nineteenth",
    20: "twentieth",
}


def int_to_words(n: int) -> str:
    """Convert an integer (up to 999,999) to English words."""
    if n == 0:
        return _ZERO
    if n < 0:
        return "negative " + int_to_words(-n)

    def under_1000(value: int) -> str:
        parts = []
        hundreds, rest = divmod(value, 100)
        if hundreds:
            parts.append(_ONES[hundreds] + " hundred")
        if rest:
            if hundreds:
                parts.append("and")
            if rest < 20:
                parts.append(_ONES[rest])
            else:
                t, u = divmod(rest, 10)
                if u:
                    parts.append(_TENS[t] + " " + _ONES[u])
                else:
                    parts.append(_TENS[t])
        return " ".join(parts)

    thousands, rest = divmod(n, 1000)
    if thousands:
        head = under_1000(thousands) + " thousand"
        if rest:
            return head + " and " + under_1000(rest)
        return head
    return under_1000(rest)


def _ordinal_word(n: int) -> str:
    if n in _ORDINALS:
        return _ORDINALS[n]
    base = int_to_words(n)
    if base.endswith("one"):
        return base[:-3] + "first"
    if base.endswith("two"):
        return base[:-3] + "second"
    if base.endswith("three"):
        return base[:-3] + "third"
    if base.endswith("five"):
        return base[:-3] + "fifth"
    if base.endswith("eight"):
        return base[:-3] + "eighth"
    if base.endswith("nine"):
        return base[:-2] + "th"
    return base + "th"


def fraction_words(num: int, den: int) -> str:
    """Spoken name of a common fraction such as 3/4 -> 'three quarters'."""
    if den == 1:
        return int_to_words(num)
    if num == 1:
        # "one half", "one quarter", "one fifth" ...
        return f"one {_ordinal_word(den)}"
    if den == 2:
        plural = "halves"
    elif den == 4:
        plural = "quarters"
    else:
        # All other ordinals pluralise with a simple 's' ("thirds", "fifths").
        plural = _ordinal_word(den) + "s"
    return f"{int_to_words(num)} {plural}"


def number_words(n) -> str:
    """Words for any numeric SymPy value (integer, rational or decimal)."""
    if isinstance(n, sp.Integer):
        return int_to_words(int(n))
    if isinstance(n, sp.Rational):
        return fraction_words(int(n.p), int(n.q))
    # Float / mpmath
    f = float(n)
    if f == int(f) and abs(f) < 1e15:
        return int_to_words(int(f))
    neg = f < 0
    s = f"{abs(f):.10g}"
    if "." in s:
        whole, _, frac = s.partition(".")
        frac = frac.rstrip("0")
        return ("negative " if neg else "") + int_to_words(int(whole or 0)) + (
            " point " + " ".join(_ONES[int(d)] if int(d) != 0 else "zero" for d in frac) if frac else ""
        )
    return ("negative " if neg else "") + s


_FUNCTION_NAMES = {
    "sin": "sine of",
    "cos": "cosine of",
    "tan": "tangent of",
    "asin": "inverse sine of",
    "acos": "inverse cosine of",
    "atan": "inverse tangent of",
    "sec": "secant of",
    "csc": "cosecant of",
    "cot": "cotangent of",
    "log": "logarithm of",
    "ln": "natural logarithm of",
    "exp": "e to the power of",
    "abs": "absolute value of",
    "floor": "floor of",
    "ceiling": "ceiling of",
    "sign": "sign of",
}


def _spoken(expr) -> str:
    """Recursively convert a SymPy expression to natural speech."""
    e = expr

    # Constants first: pi, e, i and infinity are not ordinary numbers.
    if e == sp.pi:
        return "pi"
    if e == sp.E:
        return "e"
    if e == sp.I:
        return "i"
    if e == sp.oo:
        return "infinity"
    if e == -sp.oo:
        return "negative infinity"

    if e.is_Number or isinstance(e, sp.Rational) or isinstance(e, sp.Float):
        return number_words(e)

    if isinstance(e, sp.Symbol):
        name = e.name.strip()
        if len(name) == 1 and name.isalpha():
            return name
        return " ".join(name)  # multi-letter symbol read letter by letter

    # Power / roots
    if isinstance(e, sp.Pow):
        base, exp = e.args
        # sqrt powers are Pow(x, 1/2) or Pow(x, Rational(1,2))
        if exp.is_Rational and exp.p == 1 and exp.q in (2, 3):
            root_word = {2: "square root", 3: "cube root"}[exp.q]
            return f"{root_word} of {_spoken(base)}"
        if exp.is_Rational and exp.p == 1:
            return f"the {_ordinal_word(exp.q)} root of {_spoken(base)}"
        if exp.is_integer:
            if exp == 2:
                return f"{_spoken(base)} squared"
            if exp == 3:
                return f"{_spoken(base)} cubed"
            if exp == -1:
                return f"one over {_spoken(base)}"
            if exp < 0:
                return f"one over {_spoken(base)} to the power of {number_words(-int(exp))}"
            return f"{_spoken(base)} to the power of {number_words(int(exp))}"
        return f"{_spoken(base)} to the power of {_spoken(exp)}"

    # Addition / subtraction
    if isinstance(e, sp.Add):
        return _add_spoken(e)

    # Multiplication / division
    if isinstance(e, sp.Mul):
        return _mul_spoken(e)

    # Functions
    if isinstance(e, sp.Function):
        name = str(e.func).split(".")[-1]
        head = _FUNCTION_NAMES.get(e.func.__name__ or name)
        if e.is_Function and _FUNCTION_NAMES.get(name):
            head = _FUNCTION_NAMES[name]
        if head is None:
            # Unknown function: read the function name, then arguments.
            head = name + " of"
        args = ", and ".join(_spoken(a) for a in e.args)
        # exp treated above as e^arg via Pow? exp(x) is a Function; handle here.
        if name == "exp":
            return f"e to the power of {args}"
        if len(e.args) == 1:
            return f"{head} {args}"
        return f"{head} {args}"

    return fallback_spoken(str(e))


def _add_spoken(e: sp.Add) -> str:
    # Order terms so that expressions read naturally: variable/power terms
    # first, then numeric constants (x squared plus five x minus nine).
    def key(term):
        return 0 if term.free_symbols else 1

    args = sorted(e.args, key=key)

    parts = []
    for i, term in enumerate(args):
        lead = term.as_coeff_Mul()[0]
        try:
            negative = bool(lead.is_negative)
        except Exception:  # pragma: no cover
            negative = False
        if negative:
            if i == 0 and not term.is_Number:
                parts.append("negative " + _spoken(-term))
            else:
                parts.append("minus " + _spoken(-term))
        else:
            parts.append("plus " + _spoken(term) if i > 0 else _spoken(term))
    return " ".join(parts)


def _mul_spoken(e) -> str:
    if not isinstance(e, sp.Mul):
        return _spoken(e)

    coeff, rest = e.as_coeff_Mul()

    # Numeric product (no symbols), e.g. 2 times 3.5
    if rest.is_Number or rest.is_Rational or rest.is_Float:
        if coeff == 1:
            return _spoken(rest)
        return f"{_spoken(coeff)} times {_spoken(rest)}"

    if coeff != 1:
        if coeff.is_integer:
            n = int(coeff)
            if n < 0:
                return "negative " + _mul_spoken(sp.Mul(abs(n), rest))
            if n == 1:
                return _spoken(rest)
            # 2x -> "two x", 3(x + 1) -> "three times (x plus one)"
            if isinstance(rest, sp.Symbol):
                return f"{number_words(n)} {_spoken(rest)}"
            return f"{number_words(n)} times {_parenthesise(_spoken(rest))}"
        # Fractional coefficient, e.g. (3/4)*x -> "three quarters of x"
        return f"{fraction_words(int(coeff.p), int(coeff.q))} of {_parenthesise(_spoken(rest))}"

    # Product of several symbolic factors.
    factors = []
    for f in e.args:
        if isinstance(f, sp.Add) or (isinstance(f, sp.Mul) and not _simple_factor(f)):
            factors.append(_parenthesise(_spoken(f)))
        else:
            factors.append(_spoken(f))
    return " times ".join(factors)


def _simple_factor(expr) -> bool:
    """True for factors that do not need parentheses, such as x or x**2."""
    return not isinstance(expr, sp.Add)


def _parenthesise(text: str) -> str:
    return f"({text})"


def fallback_spoken(text: str) -> str:
    """Best-effort textual cleanup when a tree walker has no rule."""
    text = text.replace("**", " to the power of ")
    text = text.replace("*", " times ")
    text = re.sub(r"\bsqrt\s*\(", "square root of ", text)
    text = text.replace("Abs(", "absolute value of ")
    text = text.replace("(", " of ")
    text = text.replace(")", "")
    text = text.replace("/", " over ")
    text = text.replace("+", " plus ").replace("-", " minus ")
    text = text.replace("==", " equals ").replace("=", " equals ")
    return " ".join(text.split())


def to_spoken(expr) -> str:
    """Convert a SymPy expression (or a string) to natural language."""
    if isinstance(expr, str):
        expr = sp.sympify(expr, evaluate=False)
    try:
        return _spoken(expr)
    except Exception:  # pragma: no cover - defensive fallback
        return fallback_spoken(str(expr))


def equation_spoken(expr) -> str:
    """Convert an equality (Eq or relational) to natural language.

    Works for Eq(lhs, rhs) as well as strings such as '2x = 5'.
    """
    if isinstance(expr, str):
        if "=" in expr and "==" not in expr:
            lhs, _, rhs = expr.partition("=")
            return f"{to_spoken(lhs)} equals {to_spoken(rhs)}"
        return to_spoken(expr)
    if isinstance(expr, sp.Eq):
        return f"{to_spoken(expr.lhs)} equals {to_spoken(expr.rhs)}"
    return to_spoken(expr)