"""Database initialisation helpers.

In addition to the automatic table creation in session.init_db, there is a
small seed script (seed_demo_data) that is optional and intended for local
demo purposes only.  It is NOT run automatically on startup.
"""
from app.database.session import SessionLocal, init_db


def seed_demo_data() -> None:
    """Create the tables and add a couple of demonstration accounts.

    Demo accounts (password: "password123"):
      - demo.student@mathable.app  (student)
      - teacher@mathable.app       (teacher role)
    """
    init_db()
    from app.services.auth_service import create_user

    db = SessionLocal()
    try:
        create_user(
            db=db,
            name="Demo Student",
            email="demo.student@mathable.app",
            password="password123",
            role="student",
        )
        create_user(
            db=db,
            name="Demo Teacher",
            email="teacher@mathable.app",
            password="password123",
            role="teacher",
        )
    except ValueError:
        # Users already exist with these emails.
        pass
    finally:
        db.close()


if __name__ == "__main__":
    seed_demo_data()
    print("Demo data ready.")