"""Input notation normalisation.

Students type mathematics in a friendly way:

    2x + 5 = 15
    (x+2)^2
    sqrt(25)
    2/3 + 1/4
    √25
    x² + 5x + 6 = 0

This module converts that text into a canonical form that SymPy can parse:

    * unicode symbols -> ascii equivalents (x² -> x^2, √25 -> sqrt(25), ...)
    * ^  -> **
    * implicit multiplication handled (2x -> 2*x, 2 x -> 2*x, (x+1)(x-1) -> (x+1)*(x-1))
    * superscript digits
"""
import re

_UNICODE_MAP = {
    "×": "*",
    "÷": "/",
    "−": "-",
    "−": "-",
    "＋": "+",
    "·": "*",
    "≤": "<=",
    "≥": ">=",
    "≠": "!=",
    "≈": "=",
    "π": "pi",
    "Π": "pi",
    "√": "sqrt",
    "²": "^2",
    "³": "^3",
    "⁴": "^4",
    "⁵": "^5",
    "⁶": "^6",
    "⁷": "^7",
    "⁸": "^8",
    "⁹": "^9",
    "…": "...",
}

# A square root directly followed by a bracketed or single-token operand.
_SQRT_RE = re.compile(r"sqrt\s*\(([^()]+)\)")
# sqrt of a number like sqrt25 (no bracket).
_SQRT_BARE_RE = re.compile(r"sqrt(\d+(?:\.\d+)?)")

# Digit/letter, closing-bracket followed by letter/opening-bracket/digit(letter) => implicit multiply
_IMPLICIT_1 = re.compile(r"(\d)([a-zA-Z(])")
_IMPLICIT_2 = re.compile(r"(\))([a-zA-Z(])")
_IMPLICIT_3 = re.compile(r"([a-zA-Z)])\s+([a-zA-Z(])")


def replace_unicode(text: str) -> str:
    """Map unicode math symbols to their ascii equivalents."""
    for src, dst in _UNICODE_MAP.items():
        text = text.replace(src, dst)
    return text


def insert_implicit_multiplication(text: str) -> str:
    """Turn 2x, 2 x, (x+1)(x+2) and x y into explicit multiplications.

    A few careful rules are applied so function calls such as sin(x) are left
    untouched (they become sin*(x) only if the pattern is not a known
    function name).
    """
    # Never insert multiplication after a known function name.
    known_functions = (
        "sin", "cos", "tan", "asin", "acos", "atan",
        "log", "ln", "exp", "sqrt", "abs", "sec", "csc", "cot",
    )

    def guard_implicit(pattern, text):
        def repl(m):
            prefix = m.group(1)
            # If group 1 is a letter sequence, check it is not the tail of a
            # known function name.
            if prefix.isalpha():
                # Find the start of the contiguous letter run.
                start = m.start(1)
                while start > 0 and text[start - 1].isalpha():
                    start -= 1
                word = text[start:m.end(1)]
                if word in known_functions:
                    return m.group(0)
            return f"{prefix}*{m.group(2)}"

        return pattern.sub(repl, text)

    text = guard_implicit(_IMPLICIT_1, text)
    text = guard_implicit(_IMPLICIT_2, text)
    text = guard_implicit(_IMPLICIT_3, text)
    return text


def normalise(raw: str) -> str:
    """Normalise a user-typed expression into SymPy-friendly syntax."""
    if raw is None:
        return ""
    text = raw.strip()
    if not text:
        return ""

    text = replace_unicode(text)

    # Square roots: sqrt(...) or sqrt(number)
    text = _SQRT_RE.sub(lambda m: f"sqrt({m.group(1).strip()})", text)
    text = _SQRT_BARE_RE.sub(lambda m: f"sqrt({m.group(1)})", text)

    # Caret becomes Python exponentiation.
    text = text.replace("^", "**")

    # Space-normalisation: remove whitespace between digits/letters/parens we
    # are about to re-inserts as multiplication.
    text = insert_implicit_multiplication(text)

    return text


def split_statements(raw: str) -> list[str]:
    """Split an input that may contain several statements.

    Supported separators: semicolon, comma or newline.
    Returns a list of trimmed statements.
    """
    parts = re.split(r"[;\n,]+", raw)
    return [p.strip() for p in parts if p.strip()]