"""Manual end-to-end smoke test through the FastAPI TestClient.

Run from the repository root::

    .\\venv\\Scripts\\python tests\\smoke_test.py

It uses a throwaway SQLite database so a previous (possibly broken) run never
changes the result.
"""
import io
import os
import random
import sys

# Force UTF-8 output on Windows so Unicode in response bodies doesn't crash.
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

# ---------------------------------------------------------------------------
# Point the app at a brand-new throwaway database.
# ---------------------------------------------------------------------------
SMOKE_DB = os.path.join(os.path.dirname(__file__), "..", "backend",
                        "mathable_smoke.db")
if os.path.exists(SMOKE_DB):
    os.remove(SMOKE_DB)
os.environ["DATABASE_URL"] = f"sqlite:///{SMOKE_DB.replace(os.sep, '/')}"
# Set teacher key before the app module is imported so config picks it up.
TEACHER_KEY = "smoke-teacher-secret"
os.environ["TEACHER_REGISTRATION_KEY"] = TEACHER_KEY

BACKEND = os.path.join(os.path.dirname(__file__), "..", "backend")
sys.path.insert(0, BACKEND)

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402

client = TestClient(app)

EMAIL = f"smoke.{random.randint(10000, 99999)}@test.app"
PASSWORD = "password123"

_pass = _fail = 0


def report(step, ok, detail=""):
    global _pass, _fail
    # Sanitise detail for Windows console (replace non-ASCII safely)
    detail = detail.encode("ascii", errors="replace").decode("ascii")
    if ok:
        _pass += 1
        print(f"[PASS] {step} {detail}".rstrip())
    else:
        _fail += 1
        print(f"[FAIL] {step} {detail}".rstrip())
    return ok


def main():
    ok = True
    headers = {}

    r = client.get("/api/health")
    ok &= report("health", r.status_code == 200
                 and r.json()["status"] == "ok", str(r.json()))

    # --- Auth ---------------------------------------------------------------
    r = client.post("/api/auth/register", json={
        "name": "Smoke Student", "email": EMAIL, "password": PASSWORD,
    })
    ok &= report("register", r.status_code == 201, str(r.json()))
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    r = client.post("/api/auth/register", json={
        "name": "X", "email": EMAIL, "password": PASSWORD,
    })
    ok &= report("duplicate register 409", r.status_code == 409,
                 str(r.json()))

    r = client.post("/api/auth/login", json={"email": EMAIL, "password": "ow"})
    ok &= report("bad login 401", r.status_code == 401)

    r = client.post("/api/auth/login", json={"email": EMAIL,
                                             "password": PASSWORD})
    ok &= report("login", r.status_code == 200)
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    r = client.get("/api/users/me", headers=headers)
    ok &= report("me", r.status_code == 200
                 and r.json()["email"] == EMAIL, str(r.json()))

    r = client.get("/api/progress")
    ok &= report("progress unauth 401", r.status_code == 401)

    # --- Solver -------------------------------------------------------------
    r = client.post("/api/solve", json={"expression": "2x + 5 = 15"},
                    headers=headers)
    ok &= report("solve linear", r.status_code == 200
                 and r.json()["answer"] == "x = 5", str(r.json()))

    r = client.post("/api/solve", json={"expression": "x^2 + 5x + 6 = 0"},
                    headers=headers)
    ok &= report("solve quadratic", r.status_code == 200
                 and "-3" in r.json()["answer"], str(r.json()))

    r = client.post("/api/solve", json={"expression": "sqrt(25)"},
                    headers=headers)
    ok &= report("solve sqrt", r.status_code == 200
                 and r.json()["answer"] == "5", str(r.json()))

    r = client.post("/api/solve", json={"expression": "3/4 + 1/2"},
                    headers=headers)
    ok &= report("solve fractions", r.status_code == 200
                 and r.json()["answer"] == "5/4", str(r.json()))

    r = client.post("/api/solve",
                    json={"expression": "2x + 3y = 12; x - y = 1"},
                    headers=headers)
    ok &= report("solve simultaneous", r.status_code == 200
                 and "x = 3" in r.json()["answer"], str(r.json()))

    r = client.post("/api/solve", json={"expression": "15% of 200"},
                    headers=headers)
    ok &= report("solve percent", r.status_code == 200
                 and r.json()["answer"] == "30", str(r.json()))

    r = client.post("/api/solve", json={"expression": "differentiate x^2"},
                    headers=headers)
    ok &= report("solve derivative", r.status_code == 200
                 and r.json()["answer"] == "2*x", str(r.json()))

    r = client.post("/api/solve", json={"expression": "hello world"},
                    headers=headers)
    ok &= report("solve invalid 422", r.status_code == 422, str(r.json()))

    r = client.post("/api/solve", json={"expression": "5/0"},
                    headers=headers)
    ok &= report("solve 5/0 422", r.status_code == 422, str(r.json()))

    # --- Practice ----------------------------------------------------------
    r = client.post("/api/practice/generate",
                    json={"topic": "algebra", "difficulty": "beginner",
                          "count": 4},
                    headers=headers)
    ok &= report("practice generate", r.status_code == 200
                 and len(r.json()["questions"]) == 4, str(r.json())[:160])

    # Verify answer submission actually works (was broken by None+= bug)
    first_q_id = r.json()["questions"][0]["id"]
    r_sub = client.post("/api/practice/submit",
                        json={"question_id": first_q_id, "answer": "0"},
                        headers=headers)
    ok &= report("practice submit works", r_sub.status_code == 200
                 and "correct" in r_sub.json(), str(r_sub.json())[:120])

    # Visit each supported difficulty/topic combination at least once.
    # "other" is the catch-all topic so it must round-trip too.
    for topic in ("arithmetic", "algebra", "calculus", "other"):
        for difficulty in ("beginner", "intermediate", "advanced"):
            r = client.post("/api/practice/generate",
                            json={"topic": topic, "difficulty": difficulty,
                                  "count": random.randint(1, 3)},
                            headers=headers)
            ok &= report(f"generate {topic}/{difficulty}",
                         r.status_code == 200
                         and len(r.json()["questions"]) > 0,
                         str(r.json())[:120])

    r = client.post("/api/practice/generate",
                    json={"topic": "bogus", "difficulty": "beginner",
                          "count": 2},
                    headers=headers)
    ok &= report("practice bogus topic 422", r.status_code == 422)

    r = client.post("/api/practice/generate",
                    json={"topic": "algebra", "difficulty": "beginner",
                          "count": 0},
                    headers=headers)
    ok &= report("practice count 0 422", r.status_code == 422)

    # --- Progress ----------------------------------------------------------
    r = client.get("/api/progress", headers=headers)
    ok &= report("progress", r.status_code == 200
                 and "overall_accuracy" in r.json(), str(r.json())[:160])

    # --- Accessibility -----------------------------------------------------
    r = client.get("/api/accessibility/settings", headers=headers)
    ok &= report("settings get", r.status_code == 200
                 and r.json()["text_size"] == "medium", str(r.json()))

    r = client.put("/api/accessibility/settings",
                   json={"text_size": "large", "contrast": "high",
                         "tts_enabled": True, "tts_rate": 11,
                         "voice_input_enabled": True},
                   headers=headers)
    ok &= report("settings update", r.status_code == 200
                 and r.json()["text_size"] == "large", str(r.json()))

    # --- Logout ------------------------------------------------------------
    r = client.post("/api/auth/logout", headers=headers)
    ok &= report("logout", r.status_code == 200)

    # --- Token Refresh -----------------------------------------------------
    # Re-login to get a fresh token, then test refresh.
    r = client.post("/api/auth/login", json={"email": EMAIL, "password": PASSWORD})
    fresh_token = r.json()["access_token"]
    fresh_headers = {"Authorization": f"Bearer {fresh_token}"}

    r = client.post("/api/auth/refresh", headers=fresh_headers)
    ok &= report("token refresh", r.status_code == 200
                 and "access_token" in r.json(), str(r.json())[:160])

    r = client.post("/api/auth/refresh")
    ok &= report("refresh unauth 403", r.status_code in (401, 403), str(r.json()))

    # --- RBAC: Teacher workflow --------------------------------------------
    TEACHER_EMAIL = f"teacher.{random.randint(10000, 99999)}@test.app"

    # Register teacher without key → role is clamped to student
    r = client.post("/api/auth/register", json={
        "name": "Fake Teacher", "email": TEACHER_EMAIL,
        "password": PASSWORD, "role": "teacher",
    })
    ok &= report("teacher register without key → student role",
                 r.status_code == 201 and r.json()["user"]["role"] == "student",
                 str(r.json())[:120])

    # Register a real teacher using the key that was baked into the running
    # app via TEACHER_REGISTRATION_KEY env var set at the top of this module.
    TEACHER_EMAIL2 = f"teacher2.{random.randint(10000, 99999)}@test.app"
    r = client.post("/api/auth/register",
                    json={"name": "Real Teacher", "email": TEACHER_EMAIL2,
                          "password": PASSWORD, "role": "teacher"},
                    headers={"X-Teacher-Key": TEACHER_KEY})
    ok &= report("teacher register with key → teacher role",
                 r.status_code == 201 and r.json()["user"]["role"] == "teacher",
                 str(r.json())[:120])
    teacher_token = r.json()["access_token"]
    t_headers = {"Authorization": f"Bearer {teacher_token}"}

    # Teacher can list students
    r = client.get("/api/teacher/students", headers=t_headers)
    ok &= report("teacher list students", r.status_code == 200
                 and isinstance(r.json(), list), str(r.json())[:120])

    # Teacher can view a student's progress
    student_id = 1  # created at top of test
    r = client.get(f"/api/teacher/students/{student_id}/progress", headers=t_headers)
    ok &= report("teacher view student progress", r.status_code == 200
                 and "overall_accuracy" in r.json(), str(r.json())[:120])

    # Teacher can view student solutions
    r = client.get(f"/api/teacher/students/{student_id}/solutions", headers=t_headers)
    ok &= report("teacher view student solutions", r.status_code == 200
                 and isinstance(r.json(), list), str(r.json())[:120])

    # Teacher can create assignment
    r = client.post("/api/teacher/assignments",
                    json={"title": "Smoke Algebra Set", "topic": "algebra",
                          "difficulty": "beginner", "question_count": 3,
                          "description": "Smoke test assignment"},
                    headers=t_headers)
    ok &= report("teacher create assignment", r.status_code == 201
                 and r.json()["title"] == "Smoke Algebra Set", str(r.json())[:120])
    assignment_id = r.json()["id"]

    # Teacher can list assignments
    r = client.get("/api/teacher/assignments", headers=t_headers)
    ok &= report("teacher list assignments", r.status_code == 200
                 and len(r.json()) == 1, str(r.json())[:120])

    # Teacher can update assignment
    r = client.put(f"/api/teacher/assignments/{assignment_id}",
                   json={"title": "Updated Set"},
                   headers=t_headers)
    ok &= report("teacher update assignment", r.status_code == 200
                 and r.json()["title"] == "Updated Set", str(r.json())[:80])

    # Teacher can view assignment results
    r = client.get(f"/api/teacher/assignments/{assignment_id}/results",
                   headers=t_headers)
    ok &= report("teacher assignment results", r.status_code == 200
                 and "results" in r.json(), str(r.json())[:120])

    # Teacher can delete assignment
    r = client.delete(f"/api/teacher/assignments/{assignment_id}", headers=t_headers)
    ok &= report("teacher delete assignment", r.status_code == 204)

    # Student cannot access teacher routes → 403
    r = client.get("/api/teacher/students", headers=fresh_headers)
    ok &= report("student blocked from teacher route 403", r.status_code == 403,
                 str(r.json()))

    # Teacher can also use the solver (shared endpoint)
    r = client.post("/api/solve", json={"expression": "2+2"}, headers=t_headers)
    ok &= report("teacher can use solver", r.status_code == 200, str(r.json())[:80])

    # Non-existent student returns 404
    r = client.get("/api/teacher/students/99999/progress", headers=t_headers)
    ok &= report("teacher view missing student 404", r.status_code == 404,
                 str(r.json()))

    print()
    print(f"SMOKE TEST: {_pass} passed, {_fail} failed")
    return _fail == 0


if __name__ == "__main__":
    sys.exit(0 if main() else 1)