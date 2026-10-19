import datetime
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime, ForeignKey, 
    UniqueConstraint, Index, Enum
)
from sqlalchemy.orm import relationship
from app.core.database import Base

class UserRole(str):
    STUDENT = "student"
    TEACHER = "teacher"
    ADMIN = "admin"
    SUPER_ADMIN = "super_admin"

class SeatStatus(str):
    AVAILABLE = "available"
    HELD = "held"
    BOOKED = "booked"
    BLOCKED = "blocked"

class BookingStatus(str):
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"

class Batch(Base):
    __tablename__ = "batches"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    users = relationship("User", back_populates="batch")
    notifications = relationship("NotificationBatch", back_populates="batch")

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    display_name = Column(String(150), nullable=False)
    role = Column(String(50), nullable=False, default=UserRole.STUDENT)
    is_active = Column(Boolean, default=True)
    batch_id = Column(Integer, ForeignKey("batches.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    last_login = Column(DateTime, nullable=True)

    batch = relationship("Batch", back_populates="users")
    bookings = relationship("Booking", back_populates="user")
    read_notifications = relationship("NotificationRecipient", back_populates="user")

class Movie(Base):
    __tablename__ = "movies"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False, index=True)
    synopsis = Column(Text, nullable=False)
    poster_url = Column(String(500), nullable=True)
    trailer_url = Column(String(500), nullable=True)
    genre = Column(String(100), nullable=False)
    duration_minutes = Column(Integer, nullable=False)
    language = Column(String(50), nullable=False, default="English")
    is_published = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    screenings = relationship("Screening", back_populates="movie", cascade="all, delete-orphan")

class Seat(Base):
    __tablename__ = "seats"

    id = Column(Integer, primary_key=True, index=True)
    seat_label = Column(String(20), unique=True, nullable=False, index=True)  # e.g. A1, B12, Z30
    row_label = Column(String(10), nullable=False)                         # e.g. A, B, C
    seat_number = Column(Integer, nullable=False)                           # e.g. 1, 2, ...
    tier = Column(String(50), default="Standard")                           # Premium, VIP, Standard
    is_active = Column(Boolean, default=True)

class Screening(Base):
    __tablename__ = "screenings"

    id = Column(Integer, primary_key=True, index=True)
    movie_id = Column(Integer, ForeignKey("movies.id", ondelete="CASCADE"), nullable=False)
    screening_date = Column(DateTime, nullable=False, index=True)
    start_time = Column(String(20), nullable=False)  # HH:MM format
    end_time = Column(String(20), nullable=False)
    status = Column(String(50), default="open")  # open, closed, cancelled
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    movie = relationship("Movie", back_populates="screenings")
    seat_inventories = relationship("ScreeningSeatInventory", back_populates="screening", cascade="all, delete-orphan")
    bookings = relationship("Booking", back_populates="screening", cascade="all, delete-orphan")

class ScreeningSeatInventory(Base):
    __tablename__ = "screening_seat_inventories"

    id = Column(Integer, primary_key=True, index=True)
    screening_id = Column(Integer, ForeignKey("screenings.id", ondelete="CASCADE"), nullable=False)
    seat_id = Column(Integer, ForeignKey("seats.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(50), default=SeatStatus.AVAILABLE)  # available, held, booked, blocked
    held_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    held_expires_at = Column(DateTime, nullable=True)

    screening = relationship("Screening", back_populates="seat_inventories")
    seat = relationship("Seat")

    __table_args__ = (
        UniqueConstraint("screening_id", "seat_id", name="uq_screening_seat"),
        Index("idx_screening_status", "screening_id", "status"),
    )

class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    booking_reference = Column(String(50), unique=True, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    screening_id = Column(Integer, ForeignKey("screenings.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(50), default=BookingStatus.CONFIRMED)  # confirmed, cancelled
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    user = relationship("User", back_populates="bookings")
    screening = relationship("Screening", back_populates="bookings")
    seats = relationship("BookingSeat", back_populates="booking", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_user_screening", "user_id", "screening_id"),
    )

class BookingSeat(Base):
    __tablename__ = "booking_seats"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False)
    seat_id = Column(Integer, ForeignKey("seats.id", ondelete="CASCADE"), nullable=False)

    booking = relationship("Booking", back_populates="seats")
    seat = relationship("Seat")

    __table_args__ = (
        UniqueConstraint("booking_id", "seat_id", name="uq_booking_seat"),
    )

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    body = Column(Text, nullable=False)
    creator_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    target_all = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    batches = relationship("NotificationBatch", back_populates="notification", cascade="all, delete-orphan")
    recipients = relationship("NotificationRecipient", back_populates="notification", cascade="all, delete-orphan")

class NotificationBatch(Base):
    __tablename__ = "notification_batches"

    id = Column(Integer, primary_key=True, index=True)
    notification_id = Column(Integer, ForeignKey("notifications.id", ondelete="CASCADE"), nullable=False)
    batch_id = Column(Integer, ForeignKey("batches.id", ondelete="CASCADE"), nullable=False)

    notification = relationship("Notification", back_populates="batches")
    batch = relationship("Batch", back_populates="notifications")

class NotificationRecipient(Base):
    __tablename__ = "notification_recipients"

    id = Column(Integer, primary_key=True, index=True)
    notification_id = Column(Integer, ForeignKey("notifications.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    is_read = Column(Boolean, default=False)
    read_at = Column(DateTime, nullable=True)

    notification = relationship("Notification", back_populates="recipients")
    user = relationship("User", back_populates="read_notifications")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    actor_id = Column(Integer, nullable=True)
    actor_username = Column(String(100), nullable=True)
    action = Column(String(100), nullable=False, index=True)
    target_entity = Column(String(100), nullable=False)
    target_id = Column(String(100), nullable=True)
    details = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

class SystemConfig(Base):
    __tablename__ = "system_configs"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, nullable=False, index=True)
    value = Column(Text, nullable=False)
    description = Column(String(255), nullable=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
