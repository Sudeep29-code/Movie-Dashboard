import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import datetime

from app.core.database import Base, get_db
from app.main import app
from app.models.models import (
    User, UserRole, Batch, Movie, Screening, Seat,
    ScreeningSeatInventory, Booking, BookingSeat, SeatStatus,
    Notification, NotificationBatch, NotificationRecipient
)
from app.core.security import get_password_hash, create_access_token

# Test in-memory database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_cinema.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()

    # Create Batches
    batch1 = Batch(name="BATCH_A", description="Batch Alpha")
    batch2 = Batch(name="BATCH_B", description="Batch Beta")
    db.add_all([batch1, batch2])
    db.flush()

    # Create Users
    hashed = get_password_hash("testpass123")
    student = User(username="test_student", password_hash=hashed, display_name="Test Student", role=UserRole.STUDENT, batch_id=batch1.id)
    student2 = User(username="test_student2", password_hash=hashed, display_name="Test Student 2", role=UserRole.STUDENT, batch_id=batch2.id)
    teacher = User(username="test_teacher", password_hash=hashed, display_name="Test Teacher", role=UserRole.TEACHER)
    admin = User(username="test_admin", password_hash=hashed, display_name="Test Admin", role=UserRole.ADMIN)
    superadmin = User(username="test_superadmin", password_hash=hashed, display_name="Test SuperAdmin", role=UserRole.SUPER_ADMIN)
    db.add_all([student, student2, teacher, admin, superadmin])
    db.flush()

    # Create Seats (15 seats)
    seats = []
    for i in range(1, 16):
        seats.append(Seat(seat_label=f"A{i}", row_label="A", seat_number=i, tier="Standard"))
    db.add_all(seats)
    db.flush()

    # Create Movie
    movie = Movie(
        title="Test Sci-Fi Feature",
        synopsis="A journey into space.",
        genre="Sci-Fi",
        duration_minutes=120,
        language="English",
        is_published=True
    )
    db.add(movie)
    db.flush()

    # Create Screening
    screening = Screening(
        movie_id=movie.id,
        screening_date=datetime.datetime.utcnow() + datetime.timedelta(days=1),
        start_time="19:00",
        end_time="21:00",
        status="open"
    )
    db.add(screening)
    db.flush()

    # Inventory
    for s in seats:
        db.add(ScreeningSeatInventory(screening_id=screening.id, seat_id=s.id, status="available"))
    db.commit()
    db.close()

    yield

    Base.metadata.drop_all(bind=engine)

def auth_headers(username: str, role: str, user_id: int):
    token = create_access_token(subject=user_id)
    return {"Authorization": f"Bearer {token}"}

def test_login_success():
    res = client.post("/api/auth/login", json={"username": "test_student", "password": "testpass123"})
    assert res.status_code == 200
    data = res.json()
    assert data["role"] == "student"
    assert "access_token" in data

def test_login_invalid_password():
    res = client.post("/api/auth/login", json={"username": "test_student", "password": "wrongpassword"})
    assert res.status_code == 401

def test_student_role_cannot_access_admin_api():
    headers = auth_headers("test_student", "student", 1)
    res = client.get("/api/admin/movies", headers=headers)
    assert res.status_code == 403

def test_student_booking_single_seat_success():
    # Student 1 books seat A1 (seat_id=1)
    headers = auth_headers("test_student", "student", 1)
    res = client.post("/api/bookings", json={"screening_id": 1, "seat_ids": [1]}, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "confirmed"
    assert len(data["seats"]) == 1
    assert data["seats"][0]["seat_label"] == "A1"

def test_student_cannot_book_second_seat_for_same_screening():
    # Student 1 attempts to book seat A2 (seat_id=2) for same screening
    headers = auth_headers("test_student", "student", 1)
    res = client.post("/api/bookings", json={"screening_id": 1, "seat_ids": [2]}, headers=headers)
    assert res.status_code == 400
    assert "already booked a seat for this screening" in res.json()["detail"]

def test_student_cannot_book_multiple_seats_in_single_request():
    # Student 2 tries to book 2 seats at once
    headers = auth_headers("test_student2", "student", 2)
    res = client.post("/api/bookings", json={"screening_id": 1, "seat_ids": [3, 4]}, headers=headers)
    assert res.status_code == 400
    assert "at most one seat" in res.json()["detail"]

def test_teacher_can_book_multiple_seats_atomically():
    # Teacher books 3 seats: A3, A4, A5 (seat_ids=3, 4, 5)
    headers = auth_headers("test_teacher", "teacher", 3)
    res = client.post("/api/bookings", json={"screening_id": 1, "seat_ids": [3, 4, 5]}, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert len(data["seats"]) == 3

def test_prevent_duplicate_booking_collision():
    # Seat A1 is already booked. Student 2 tries to book seat A1.
    headers = auth_headers("test_student2", "student", 2)
    res = client.post("/api/bookings", json={"screening_id": 1, "seat_ids": [1]}, headers=headers)
    assert res.status_code == 409
    assert "is no longer available" in res.json()["detail"]

def test_batch_targeted_notifications():
    # Admin sends notification to BATCH_A (id=1)
    admin_headers = auth_headers("test_admin", "admin", 4)
    res = client.post("/api/admin/notifications", json={
        "title": "Alpha Exclusive Announcement",
        "body": "Welcome to Batch A students.",
        "target_all": False,
        "batch_ids": [1]
    }, headers=admin_headers)
    assert res.status_code == 200
    assert res.json()["recipients_count"] == 1

    # Student 1 (Batch A) should receive it
    st1_headers = auth_headers("test_student", "student", 1)
    res1 = client.get("/api/notifications/me", headers=st1_headers)
    assert res1.status_code == 200
    notifs1 = res1.json()
    assert any(n["title"] == "Alpha Exclusive Announcement" for n in notifs1)

    # Student 2 (Batch B) should NOT receive it
    st2_headers = auth_headers("test_student2", "student", 2)
    res2 = client.get("/api/notifications/me", headers=st2_headers)
    assert res2.status_code == 200
    notifs2 = res2.json()
    assert not any(n["title"] == "Alpha Exclusive Announcement" for n in notifs2)
