"""Convert spoken phrases into mathematical expressions.

Speech recognition engines often return natural language such as:

    two x plus five equals fifteen
    square root of twenty five
    x squared plus five x plus six equals zero
    fifteen percent of two hundred

This module converts those word streams into the same notation the keyboard
parser accepts (for example "2*x + 5 = 15"), so that the rest of the
pipeline only ever deals with symbolic input.
"""
import re

_NUMBER_WORDS = {
    "zero": 0, "oh": 0, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
    "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10, "eleven": 11,
    "twelve": 12, "thirteen": 13, "fourteen": 14, "fifteen": 15, "sixteen": 16,
    "seventeen": 17, "eighteen": 18, "nineteen": 19, "twenty": 20,
    "thirty": 30, "forty": 40, "fifty": 50, "sixty": 60, "seventy": 70,
    "eighty": 80, "ninety": 90,
}

# Fraction denominators: "two thirds" -> numerator is the preceding number.
_FRACTION_WORDS = {
    "half": 2, "halves": 2, "third": 3, "thirds": 3, "quarter": 4,
    "quarters": 4, "fifth": 5, "fifths": 5, "sixth": 6, "sixths": 6,
    "seventh": 7, "sevenths": 7, "eighth": 8, "eighths": 8, "ninth": 9,
    "ninths": 9, "tenth": 10, "tenths": 10,
}

_MATH_MARKER = re.compile(
    r"\b(equals|equal to|plus|minus|times|squared|cubed|divided by|"
    r"square root of|to the power of|percent|half|quarters|overt|over)\b"
)

_VARIABLES = {"x", "y", "z", "a", "b", "c", "d", "p", "q", "r", "t", "u", "v"}
_FUNCTIONS = {"sin", "cos", "tan", "log", "ln", "abs", "exp", "sqrt"}


def _words_to_number(tokens: list[str], start: int):
    """Consume a run of number words starting at index ``start``.

    Returns (value, next_index) or (None, start).
    """
    i = start
    total = 0
    consumed = False
    while i < len(tokens):
        word = tokens[i]
        if word == "hundred":
            total *= 100
            consumed = True
        elif word in _NUMBER_WORDS:
            total += _NUMBER_WORDS[word]
            consumed = True
        elif word == "and" and i + 1 < len(tokens) \
                and tokens[i + 1] in _NUMBER_WORDS:
            # "two hundred and five"
            i += 1
            continue
        else:
            break
        i += 1
    if not consumed:
        return None, start
    return total, i


def words_to_expression(text: str) -> str | None:
    """Translate a spoken maths phrase into symbolic text.

    Returns None when the text does not look like spoken mathematics, so the
    caller can keep the original input.
    """
    if not text:
        return None

    lowered = text.strip().lower()
    if not _MATH_MARKER.search(lowered):
        return None

    tokens = re.findall(r"[a-z][a-z']*|\d+|[+\-*/^()=%]", lowered)
    if not tokens:
        return None

    out = []
    i = 0
    while i < len(tokens):
        word = tokens[i]

        # Three-word operators.
        three = " ".join(tokens[i:i + 3]) if i + 2 < len(tokens) else ""
        if three in ("is equal to", "to the power of", "divided by",
                     "square root of", "open parentheses",
                     "close parentheses", "multiplied by"):
            symbol = {
                "is equal to": "=",
                "to the power of": "^",
                "divided by": "/",
                "square root of": "sqrt(",
                "open parentheses": "(",
                "close parentheses": ")",
                "multiplied by": "*",
            }[three]
            out.append(symbol)
            i += 3
            continue

        # Two-word operators.
        two = " ".join(tokens[i:i + 2]) if i + 1 < len(tokens) else ""
        if two in ("square root", "open parenthesis", "left bracket",
                   "open bracket", "close parenthesis", "right bracket",
                   "close bracket", "per cent"):
            symbol = {
                "square root": "sqrt(",
                "open parenthesis": "(",
                "left bracket": "(",
                "open bracket": "(",
                "close parenthesis": ")",
                "right bracket": ")",
                "close bracket": ")",
                "per cent": "%",
            }[two]
            out.append(symbol)
            i += 2
            continue

        # Number words (including fractional numerators).
        if word in _NUMBER_WORDS:
            val, nxt = _words_to_number(tokens, i)
            if val is not None:
                if nxt < len(tokens) and tokens[nxt] in _FRACTION_WORDS:
                    den = _FRACTION_WORDS[tokens[nxt]]
                    out.append(f"{val}/{den}")
                    i = nxt + 1
                    continue
                out.append(str(val))
                i = nxt
                continue

        # Fraction word on its own: assume numerator 1.
        if word in _FRACTION_WORDS:
            out.append(f"1/{_FRACTION_WORDS[word]}")
            i += 1
            continue

        if word in ("plus", "add"):
            out.append("+")
        elif word in ("minus", "subtract", "negative", "take"):
            out.append("-")
        elif word in ("times", "multiply"):
            out.append("*")
        elif word in ("equals", "equal"):
            out.append("=")
        elif word in ("divided", "over", "per", "overt"):
            if word == "divided":
                out.append("/")
            else:
                out.append("/")
        elif word in ("squared", "square"):
            out.append("^2")
        elif word in ("cubed", "cube"):
            out.append("^3")
        elif word in ("power", "raised"):
            out.append("^")
        elif word == "percent":
            out.append("%")
        elif word == "of":
            # Keep 'of' with spaces so that "15% of 200" survives parsing.
            out.append(" of ")
        elif word in _VARIABLES:
            out.append(word)
        elif word in _FUNCTIONS:
            out.append(word + "(")
        elif word in ("+", "-", "*", "^", "/", "(", ")", "%", "="):
            out.append(word)
        else:
            # Unknown ordinary word: drop it (e.g. "please", "what", "is").
            pass
        i += 1

    result = "".join(out)

    # Balance brackets opened by sqrt/function words.
    opens = result.count("(")
    closes = result.count(")")
    if opens > closes:
        result += ")" * (opens - closes)

    # Collapse accidental double operators.
    while "--" in result or "++" in result or "**" in result:
        result = result.replace("--", "-").replace("++", "+").replace("**", "^")

    result = result.strip()
    if not result:
        return None
    return result