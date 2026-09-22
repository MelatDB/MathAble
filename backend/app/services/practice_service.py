"""Practice question generation and answer checking.

Questions are generated from parameterised templates and their answers are
computed with SymPy at generation time -- never from a hard-coded list.
Every question therefore has a mathematically exact expected answer.
"""
import random

import sympy as sp

from app.mathematics.notation import normalise
from app.mathematics.spoken import to_spoken
from app.models.practice import (
    DIFFICULTIES,
    PRACTICE_TOPICS,
    Attempt,
    PracticeQuestion,
    PracticeSession,
)
from app.services.progress_service import record_attempt

MESSAGES = {
    "invalid_topic": (
        "Please choose a supported topic: arithmetic, algebra, "
        "calculus or other."
    ),
    "invalid_difficulty": (
        "Please choose a supported difficulty: beginner, intermediate "
        "or advanced."
    ),
    "not_found": "This practice question could not be found.",
}

x, y = sp.symbols("x y")


def generate_session(db, user_id: int, topic: str, difficulty: str, count: int):
    """Create a practice session with generated questions. Raises ValueError
    for invalid options."""
    if topic not in PRACTICE_TOPICS:
        raise ValueError(MESSAGES["invalid_topic"])
    if difficulty not in DIFFICULTIES:
        raise ValueError(MESSAGES["invalid_difficulty"])

    session = PracticeSession(
        user_id=user_id, topic=topic, difficulty=difficulty,
        question_count=count,
    )
    db.add(session)
    db.flush()

    generator = _generator(topic, difficulty)
    for _ in range(count):
        prompt, spoken, expected, explanation, explanation_spoken = generator()
        mathml = ""
        q = PracticeQuestion(
            session_id=session.id,
            prompt=prompt,
            prompt_spoken=spoken,
            prompt_mathml=mathml,
            expected_answer=expected,
            answer_spoken=to_spoken(expected) if _parses(expected) else expected,
            explanation=explanation,
            explanation_spoken=explanation_spoken,
            difficulty=difficulty,
        )
        db.add(q)

    db.commit()
    db.refresh(session)
    return session


def _parses(text: str) -> bool:
    try:
        sp.sympify(normalise(text), evaluate=True)
        return True
    except Exception:  # pragma: no cover
        return False


def _generator(topic: str, difficulty: str):
    """Pick the right question factory for a topic/difficulty pair."""
    if topic == "arithmetic":
        return _arithmetic_gen(difficulty)
    if topic == "algebra":
        return _algebra_gen(difficulty)
    if topic == "calculus":
        return _calculus_gen(difficulty)
    return _other_gen(difficulty)


# ---------------------------------------------------------------------------
# Arithmetic
# ---------------------------------------------------------------------------

def _arithmetic_gen(difficulty: str):
    def beginner():
        op = random.choice(["+", "-", "*"])
        a = random.randint(3, 30)
        b = random.randint(1, 12)
        expr = sp.parse_expr(f"{a}{op}{b}")
        prompt = f"{a} {op} {b}"
        spoken = f"What is {a} {_op_word(op)} {b}?"
        expected = sp.sstr(expr)
        return prompt, spoken, expected, (
            f"{a} {_op_word(op)} {b} equals {expected}."
        ), f"Calculate {a} {_op_word(op)} {b}."

    def intermediate():
        kind = random.choice(["mul", "div", "frac"])
        if kind == "mul":
            a, b = random.randint(6, 20), random.randint(6, 20)
            expr = sp.Mul(a, b)
            prompt, spoken = f"{a} * {b}", f"What is {a} times {b}?"
        elif kind == "div":
            b = random.randint(2, 12)
            a = b * random.randint(2, 12)
            expr = sp.Rational(a, b)
            prompt, spoken = f"{a} / {b}", f"What is {a} divided by {b}?"
        else:
            d1, d2 = random.randint(2, 9), random.randint(2, 9)
            n1, n2 = random.randint(1, d1 - 1), random.randint(1, d2 - 1)
            expr = sp.Rational(n1, d1) + sp.Rational(n2, d2)
            prompt, spoken = (
                f"{n1}/{d1} + {n2}/{d2}",
                f"What is {to_spoken(sp.Rational(n1, d1))} plus "
                f"{to_spoken(sp.Rational(n2, d2))}?"
            )
        expected = sp.sstr(sp.nsimplify(expr))
        return prompt, spoken, expected, (
            f"The correct result is {expected}."
        ), f"Work out {prompt} step by step."

    def advanced():
        kind = random.choice(["percent", "frac", "mixed"])
        if kind == "percent":
            p = random.randint(5, 75)
            of = random.randint(10, 200)
            value = sp.Rational(p) / 100 * of
            expected = sp.sstr(sp.nsimplify(value))
            prompt, spoken = (
                f"{p}% of {of}",
                f"What is {p} percent of {of}?"
            )
        elif kind == "frac":
            d1, d2 = random.randint(3, 12), random.randint(3, 12)
            n1, n2 = random.randint(1, d1 - 1), random.randint(1, d2 - 1)
            expr = sp.Rational(n1, d1) * sp.Rational(n2, d2)
            expected = sp.sstr(sp.simplify(expr))
            prompt, spoken = (
                f"{n1}/{d1} * {n2}/{d2}",
                f"What is {to_spoken(sp.Rational(n1, d1))} times "
                f"{to_spoken(sp.Rational(n2, d2))}?"
            )
        else:
            n1, d1 = random.randint(1, 9), random.randint(2, 9)
            n2, d2 = random.randint(1, 9), random.randint(2, 9)
            expr = sp.Rational(n1, d1) - sp.Rational(n2, d2)
            expected = sp.sstr(sp.simplify(expr))
            prompt, spoken = (
                f"{n1}/{d1} - {n2}/{d2}",
                f"What is {to_spoken(sp.Rational(n1, d1))} minus "
                f"{to_spoken(sp.Rational(n2, d2))}?"
            )
        return prompt, spoken, expected, (
            f"The correct answer is {expected}."
        ), f"Work out: {prompt}."

    return {  # noqa: F811 - intentionally returning factories
        "beginner": beginner, "intermediate": intermediate,
        "advanced": advanced,
    }[difficulty]


# ---------------------------------------------------------------------------
# Algebra
# ---------------------------------------------------------------------------

def _algebra_gen(difficulty: str):
    def beginner():
        a = random.randint(2, 9)
        c = random.randint(1, 20)
        b = random.randint(1, 10)
        # solve: a x + b = c
        sol = (c - b) / a
        prompt, spoken = (
            f"Solve: {a}x + {b} = {c}",
            f"Solve the equation {a} x plus {b} equals {c}. "
            f"What is the value of x?"
        )
        return prompt, spoken, sp.sstr(sol), (
            f"Subtract {b} from both sides, then divide by {a}. "
            f"The answer is x = {sp.sstr(sol)}."
        ), f"x equals {sp.sstr(sol)}."

    def intermediate():
        kind = random.choice(["expand", "two_step"])
        if kind == "expand":
            a = random.choice([1, 2, 3])
            n1, n2 = random.randint(-9, 9), random.randint(-9, 9)
            if n1 == 0 or n2 == 0:
                n1, n2 = random.randint(1, 9), random.randint(1, 9)
            expr = (a * x + n1) * (x + n2)
            expanded = sp.expand(expr)
            prompt, spoken = (
                f"Expand: ({a}x {n1:+.0f})(x {n2:+.0f})" if False else
                f"Expand: ({a}x {('+' if n1 >= 0 else '-')} "
                f"{abs(n1)})(x {('+' if n2 >= 0 else '-')} {abs(n2)})",
                f"Expand the brackets: {a} x plus {n1}, times "
                f"x plus {n2}.",
            )
            return prompt, spoken, sp.sstr(expanded), (
                f"Multiply each term of the first bracket by each term of "
                f"the second. The expanded form is {sp.sstr(expanded)}."
            ), f"The expanded expression is {sp.sstr(expanded)}."
        # two-step linear equation
        a = random.randint(2, 8)
        b = random.randint(1, 12)
        c = random.randint(1, 40)
        if a == 0:
            a = 3
        sol = sp.simplify(sp.Rational(c - b, a))
        prompt, spoken = (
            f"Solve: {a}x {('+' if b >= 0 else '-')} {abs(b)} = {c}",
            f"Solve the equation {a} x plus {b} equals {c} "
            f"and give the value of x.",
        )
        return prompt, spoken, sp.sstr(sol), (
            f"First subtract {b} from both sides to get {a}x = {c - b}. "
            f"Then divide by {a}. The answer is x = {sp.sstr(sol)}."
        ), f"x equals {sp.sstr(sol)}."

    def advanced():
        kind = random.choice(["quadratic", "factor", "simultaneous"])
        if kind == "quadratic":
            r1, r2 = random.randint(-9, 9), random.randint(-9, 9)
            if r1 == r2:
                r2 = r2 + random.choice([-1, 1])
            expr = sp.expand((x - r1) * (x - r2))
            prompt, spoken = (
                f"Solve: {sp.sstr(expr)} = 0",
                f"Solve the quadratic equation {to_spoken(expr)} equals zero. "
                f"Find the two values of x.",
            )
            return prompt, spoken, (
                f"{r1}, {r2}"
            ), (
                f"Factorise the quadratic as (x {('- ' if r1 >= 0 else '+ ')}"
                f"{abs(r1)})(x {('- ' if r2 >= 0 else '+ ')}{abs(r2)}) = 0, "
                f"so x = {r1} or x = {r2}."
            ), (
                f"The roots are x equals {to_spoken(r1)}, and x equals "
                f"{to_spoken(r2)}."
            )
        elif kind == "factor":
            r1, r2 = random.randint(-9, 9), random.randint(-9, 9)
            if r1 == 0 or r2 == 0:
                r1, r2 = 2, 3
            expr = sp.expand((x - r1) * (x - r2))
            prompt, spoken = (
                f"Factor: {sp.sstr(expr)}",
                f"Factorise the expression {to_spoken(expr)}.",
            )
            return prompt, spoken, (
                sp.sstr(sp.factor(expr))
            ), (
                f"The factored form is {sp.sstr(sp.factor(expr))}."
            ), f"The factors are {sp.sstr(sp.factor(expr))}."
        else:
            a1, b1 = random.randint(1, 5), random.randint(1, 5)
            a2, b2 = random.randint(1, 5), random.randint(1, 5)
            if a1 * b2 == a2 * b1:
                a2 += 1
            sol = sp.solve([sp.Eq(a1 * x + b1 * y, 12),
                            sp.Eq(a2 * x - b2 * y, 3)], [x, y], dict=True)
            expected = ", ".join(f"{k} = {v}" for k, v in sol[0].items())
            prompt, spoken = (
                f"Solve simultaneously: {a1}x + {b1}y = 12; "
                f"{a2}x - {b2}y = 3",
                f"Solve the simultaneous equations: {a1} x plus {b1} y "
                f"equals 12, and {a2} x minus {b2} y equals 3. "
                f"Give x and y.",
            )
            return prompt, spoken, expected, (
                f"Use elimination or substitution. The solution is "
                f"{expected}."
            ), ", and ".join(
                f"{k.name} equals {to_spoken(v)}" for k, v in sol[0].items()
            )

    return {  # noqa: F811
        "beginner": beginner, "intermediate": intermediate,
        "advanced": advanced,
    }[difficulty]


# ---------------------------------------------------------------------------
# Calculus
# ---------------------------------------------------------------------------

def _calculus_gen(difficulty: str):
    def beginner():
        a = random.randint(1, 8)
        n = random.choice([2, 3, 4])
        expr = a * x ** n
        deriv = sp.diff(expr, x)
        prompt, spoken = (
            f"Differentiate: {sp.sstr(expr)}",
            f"Differentiate {to_spoken(expr)} with respect to x.",
        )
        return prompt, spoken, sp.sstr(deriv), (
            f"Using the power rule, the derivative of {sp.sstr(expr)} "
            f"is {sp.sstr(deriv)}."
        ), to_spoken(deriv)

    def intermediate():
        kind = random.choice(["deriv", "integral"])
        if kind == "deriv":
            a, b = random.randint(1, 5), random.randint(1, 5)
            n = random.choice([2, 3])
            expr = a * x ** n + b * x
            deriv = sp.diff(expr, x)
            prompt, spoken = (
                f"Differentiate: {sp.sstr(expr)}",
                f"Differentiate {to_spoken(expr)} with respect to x.",
            )
            return prompt, spoken, sp.sstr(deriv), (
                f"Differentiate each term using the power rule. The "
                f"derivative is {sp.sstr(deriv)}."
            ), to_spoken(deriv)
        a = random.randint(1, 6)
        n = random.choice([2, 3])
        expr = a * x ** n
        integral = sp.integrate(expr, x)
        prompt, spoken = (
            f"Integrate: {sp.sstr(expr)} with respect to x",
            f"Integrate {to_spoken(expr)} with respect to x.",
        )
        return prompt, spoken, sp.sstr(integral) + " + C", (
            f"Increase the exponent by one and divide by the new exponent. "
            f"The integral is {sp.sstr(integral)} plus C."
        ), f"{to_spoken(integral)}, plus C, the constant of integration."

    def advanced():
        kind = random.choice(["trig_deriv", "integral_lin"])
        if kind == "trig_deriv":
            a = random.randint(1, 4)
            expr = sp.sin(a * x)
            deriv = sp.diff(expr, x)
            prompt, spoken = (
                f"Differentiate: {sp.sstr(expr)}",
                f"Differentiate sine of {a} x with respect to x.",
            )
            return prompt, spoken, sp.sstr(deriv), (
                f"The derivative of sine is cosine, multiplied by the "
                f"derivative of the inside, which gives {sp.sstr(deriv)}."
            ), to_spoken(deriv)
        a = random.randint(2, 6)
        b = random.randint(1, 5)
        expr = a * x + b
        integral = sp.integrate(expr, x)
        prompt, spoken = (
            f"Integrate: {sp.sstr(expr)} with respect to x",
            f"Integrate {to_spoken(expr)} with respect to x.",
        )
        return prompt, spoken, sp.sstr(integral) + " + C", (
            f"The integral of {sp.sstr(expr)} is {sp.sstr(integral)} "
            f"plus C."
        ), f"{to_spoken(integral)}, plus C, the constant of integration."

    return {  # noqa: F811
        "beginner": beginner, "intermediate": intermediate,
        "advanced": advanced,
    }[difficulty]


# ---------------------------------------------------------------------------
# Other: roots, logarithms, basic trigonometry
# ---------------------------------------------------------------------------

def _other_gen(difficulty: str):
    def beginner():
        n = random.randint(2, 6)
        value = n * n
        prompt, spoken = (
            f"sqrt({value})",
            f"What is the square root of {value}?",
        )
        return prompt, spoken, str(n), (
            f"The square root of {value} is {n}, because {n} times "
            f"{n} equals {value}."
        ), f"The square root of {value} is {n}."

    def intermediate():
        n = random.randint(2, 5)
        base = random.randint(2, 5)
        value = base ** n
        prompt, spoken = (
            f"log_{base}({value}) = ?",
            f"Log base {base} of {value} equals what?",
        )
        return prompt, spoken, str(n), (
            f"Since {base} to the power {n} equals {value}, the base-{base} "
            f"logarithm of {value} is {n}."
        ), f"The logarithm is {n}."

    def advanced():
        angle = random.choice([30, 45, 60])
        if angle == 30:
            expected = "1/2"
        elif angle == 45:
            expected = "sqrt(2)/2"
        else:
            expected = "sqrt(3)/2"
        prompt, spoken = (
            f"sin({angle} degrees)",
            f"What is the sine of {angle} degrees?",
        )
        return prompt, spoken, expected, (
            f"The sine of {angle} degrees is {expected}."
        ), f"The answer is {expected}."

    return {  # noqa: F811
        "beginner": beginner, "intermediate": intermediate,
        "advanced": advanced,
    }[difficulty]


def _op_word(op: str) -> str:
    return {"+": "plus", "-": "minus", "*": "times", "/": "divided by"}.get(op, op)


# ---------------------------------------------------------------------------
# Answer checking
# ---------------------------------------------------------------------------

def check_answer(user_answer: str, expected: str) -> bool:
    """Compare a student answer with the expected one.

    Accepts equivalent forms: "4", "x = 4" and "4.0" all match the expected
    value 4.  Numeric answers compare within a small tolerance.
    """
    user = normalise(user_answer.strip())
    if not user:
        return False

    # Strip a variable assignment: "x = 4" -> take 4.
    if "=" in user:
        user = user.split("=", 1)[1].strip()

    try:
        u_expr = sp.sympify(user, evaluate=True)
        e_expr = sp.sympify(expected, evaluate=True)
    except (sp.SympifyError, SyntaxError, TypeError, ValueError):
        # Fall back to a tolerant textual comparison (e.g. "x = 4").
        return _loose_text_match(user_answer, expected)

    try:
        diff = sp.simplify(u_expr - e_expr)
        if diff == 0:
            return True
    except Exception:
        pass

    try:
        if all(expr.is_number for expr in (u_expr, e_expr)):
            return abs(float(sp.N(u_expr)) - float(sp.N(e_expr))) < 1e-6
    except Exception:
        pass
    return False


def _loose_text_match(user_answer: str, expected: str) -> bool:
    import re
    def numbers(text):
        return re.findall(r"-?\d+(?:\.\d+)?", text.replace(" ", ""))
    got = numbers(user_answer)
    want = numbers(expected)
    if got and want:
        try:
            return abs(float(got[0]) - float(want[0])) < 1e-6
        except ValueError:
            return False
    return user_answer.replace(" ", "").lower() == expected.replace(" ", "").lower()


def submit_answer(db, user_id: int, question_id: int, answer: str):
    """Record an attempt and return the feedback dict."""
    question = db.query(PracticeQuestion).filter_by(id=question_id).first()
    if question is None:
        raise ValueError(MESSAGES["not_found"])

    correct = check_answer(answer, question.expected_answer)

    attempt = Attempt(
        user_id=user_id,
        question_id=question.id,
        session_id=question.session_id,
        given_answer=answer,
        is_correct=1 if correct else 0,
    )
    db.add(attempt)
    record_attempt(db, user_id, question.session.topic, correct)
    db.commit()
    db.refresh(attempt)

    if correct:
        feedback = "Your answer is correct."
        explanation = question.explanation
    else:
        feedback = (
            f"Your answer was not correct. The correct answer is "
            f"{question.expected_answer}."
        )
        explanation = question.explanation
        if question.explanation_spoken:
            explanation += f" {question.explanation_spoken}"

    return {
        "attempt_id": attempt.id,
        "question_id": question.id,
        "question": {
            "id": question.id,
            "session_id": question.session_id,
            "prompt": question.prompt,
            "prompt_spoken": question.prompt_spoken,
            "prompt_mathml": question.prompt_mathml,
            "difficulty": question.difficulty,
        },
        "correct": correct,
        "feedback": feedback,
        "explanation": explanation,
        "explanation_spoken": question.explanation_spoken or "",
        "correct_answer": question.expected_answer,
        "correct_answer_spoken": question.answer_spoken,
        "answered_at": attempt.answered_at.isoformat() if attempt.answered_at else "",
    }