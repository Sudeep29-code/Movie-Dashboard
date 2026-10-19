import datetime
from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine, Base
from app.core.security import get_password_hash
from app.models.models import (
    User, UserRole, Batch, Movie, Screening, Seat, ScreeningSeatInventory,
    Notification, NotificationBatch, NotificationRecipient, SystemConfig
)

def seed_database():
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    try:
        # Check if already seeded
        if db.query(User).first():
            print("Database already contains data. Skipping full reseed.")
            return

        print("Seeding initial data...")

        # 1. Batches
        batch_cs = Batch(name="CS-2026-A", description="Computer Science Batch 2026 Section A")
        batch_ee = Batch(name="EE-2026-B", description="Electrical Engineering Batch 2026 Section B")
        db.add_all([batch_cs, batch_ee])
        db.flush()

        # 2. Users (SuperAdmin, Admin, Teacher, Students)
        # Note: All demo passwords are 'cinema123'
        demo_pass_hash = get_password_hash("cinema123")

        super_admin = User(
            username="superadmin",
            password_hash=demo_pass_hash,
            display_name="Master Director (Super Admin)",
            role=UserRole.SUPER_ADMIN,
            is_active=True
        )

        admin = User(
            username="admin",
            password_hash=demo_pass_hash,
            display_name="Cinema Manager (Admin)",
            role=UserRole.ADMIN,
            is_active=True
        )

        teacher = User(
            username="teacher",
            password_hash=demo_pass_hash,
            display_name="Prof. Harrison (Teacher)",
            role=UserRole.TEACHER,
            is_active=True
        )

        student1 = User(
            username="student1",
            password_hash=demo_pass_hash,
            display_name="Alex Rivera (CS Student)",
            role=UserRole.STUDENT,
            batch_id=batch_cs.id,
            is_active=True
        )

        student2 = User(
            username="student2",
            password_hash=demo_pass_hash,
            display_name="Maya Lin (EE Student)",
            role=UserRole.STUDENT,
            batch_id=batch_ee.id,
            is_active=True
        )

        db.add_all([super_admin, admin, teacher, student1, student2])
        db.flush()

        # 3. Generate Auditorium Seats (~821 seats)
        # Rows A to Z (26 rows), and AA, BB (2 extra rows) = 28 rows
        # Rows A-E: VIP (25 seats each = 125)
        # Rows F-V: Standard (30 seats each = 17 * 30 = 510)
        # Rows W-Z: Premium Balcony (32 seats each = 4 * 32 = 128)
        # Rows AA-BB: Upper Balcony (29 seats each = 2 * 29 = 58)
        # Total = 125 + 510 + 128 + 58 = 821 seats!
        seat_objects = []
        rows_layout = (
            [(chr(65 + i), 25, "VIP") for i in range(5)] +             # A to E
            [(chr(65 + i), 30, "Standard") for i in range(5, 22)] +    # F to V
            [(chr(65 + i), 32, "Premium Balcony") for i in range(22, 26)] + # W to Z
            [("AA", 29, "Upper Balcony"), ("BB", 29, "Upper Balcony")] # AA, BB
        )

        for row_label, seat_count, tier in rows_layout:
            for s_num in range(1, seat_count + 1):
                seat_objects.append(Seat(
                    seat_label=f"{row_label}{s_num}",
                    row_label=row_label,
                    seat_number=s_num,
                    tier=tier,
                    is_active=True
                ))

        db.bulk_save_objects(seat_objects)
        db.commit()
        print(f"Generated {len(seat_objects)} auditorium seats successfully.")

        # Re-fetch seats for inventory association
        all_seats = db.query(Seat).all()

        # 4. Movie
        movie = Movie(
            title="Interstellar: Beyond Horizons",
            synopsis="A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival as Earth faces catastrophic ecological collapse.",
            poster_url="https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80",
            trailer_url="https://www.youtube.com/watch?v=zSWdZVtXT7E",
            genre="Sci-Fi / Drama / Adventure",
            duration_minutes=169,
            language="English with Subtitles",
            is_published=True
        )
        db.add(movie)
        db.flush()

        # 5. Screening
        tomorrow = datetime.datetime.utcnow() + datetime.timedelta(days=1)
        screening = Screening(
            movie_id=movie.id,
            screening_date=tomorrow,
            start_time="18:30",
            end_time="21:30",
            status="open"
        )
        db.add(screening)
        db.flush()

        # 6. Screening Seat Inventory
        inventories = [
            ScreeningSeatInventory(
                screening_id=screening.id,
                seat_id=s.id,
                status="available"
            )
            for s in all_seats
        ]
        db.bulk_save_objects(inventories)
        db.commit()
        print(f"Screening seat inventory created with {len(inventories)} available seats.")

        # 7. Targeted Notification for CS Batch
        notif = Notification(
            title="Exclusive CS Screening Reservation Open",
            body="Reserved front-tier student seats are now open for CS-2026-A students. Please secure your ticket early.",
            creator_id=admin.id,
            target_all=False
        )
        db.add(notif)
        db.flush()

        nb = NotificationBatch(notification_id=notif.id, batch_id=batch_cs.id)
        db.add(nb)

        # CS Student gets delivery
        nr = NotificationRecipient(notification_id=notif.id, user_id=student1.id, is_read=False)
        db.add(nr)

        # 8. System Config
        sys_config = SystemConfig(
            key="TEACHER_MAX_SEATS",
            value="10",
            description="Maximum number of cinema seats a teacher can book in a single transaction"
        )
        db.add(sys_config)
        db.commit()

        print("Database successfully seeded with demo accounts, movie, 821 seats, and screening inventory.")

    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
