# MathAble — math practice web app for blind & visually impaired students

Accessibility-first practice: the API always returns a spoken sentence, a
MathML fragment, and structured steps for every problem, and the solver engine
computes real answers with **SymPy** (never a hard-coded lookup). The frontend
is a keyboard-first React SPA with a skip link, live-region announcements,
focus-management primitivesaine koro.

## Project layout

```
backend/          FastAPI + SQLAlchemy + SymPy engine (solves, practice,
                  progress, accessibility settings, JWT auth)
frontend/         React + Vite SPA (accessible solve/practice/progress views)
tests/            Backend smoke test + pytest unit suite
README.md
```

## Backend

Requires Python 3.11+. From `backend/`:

```bash
python -m venv ../venv
source ../venv/bin/activate          # Windows: ..\venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                  # set DATABASE_URL / SECRET_KEY
uvicorn app.main:app --reload
```

API docs: http://127.0.0.1:8000/docs · Health check: `/api/health`.

### Endpoints (all under `/api`)

| Method | Path                        | Purpose                              |
|--------|-----------------------------|--------------------------------------|
| POST   | /auth/register              | Create account, return JWT           |
| POST   | /auth/login                 | Log in, return JWT                   |
| POST   | /auth/logout                | Invalidate client token              |
| GET    | /users/me                   | Current profile                      |
| POST   | /solve                      | Interpret + solve an expression      |
| GET    | /problems/history           | Recent solved problems               |
| POST   | /practice/generate          | Generate a practice session          |
| POST   | /practice/submit            | Check an answer, record attempt      |
| GET    | /progress                   | Per-topic accuracy + recent activity |
| GET    | /accessibility/settings     | Saved accessibility preferences      |
| PUT    | /accessibility/settings     | Update accessibility preferences     |
| GET    | /health                     | Liveness probe                       |

All solving is done symbolically with SymPy — the answer, spoken sentence and
MathML are computed from the actual solution, never from a lookup table.

## Accessibility

- Every endpoint returns `_spoken` and `_mathml` variants of the math so a
  screen reader (and the optional TTS) can read it aloud correctly.
- The frontend provides a skip link, keyboard-only navigation, focus
  management, and live-region announcements (WCAG 2.1 AA intent).
- Text size, contrast, TTS rate and voice-input toggles are persisted per user
  under `/api/accessibility/settings`.

## Tests

```bash
cd tests
python smoke_test.py        # end-to-end REST flow
pytest                       # unit suite
```

## License

MIT — see [LICENSE](LICENSE).
