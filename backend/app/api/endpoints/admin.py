from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from app.core.database import get_db
from app.api.deps import require_roles, get_current_user
from app.models.models import (
    User, UserRole, Movie, Screening, ScreeningSeatInventory, Seat,
    Batch, Notification, NotificationBatch, NotificationRecipient,
    Booking, BookingStatus, AuditLog
)
from app.schemas.schemas import (
    MovieCreate, MovieOut, ScreeningCreate, ScreeningOut,
    BatchCreate, BatchOut, NotificationCreate, NotificationOut,
    UserOut, BookingOut, BookingSeatOut
)

router = APIRouter(prefix="/admin", tags=["admin"])

# Require Admin or Super Admin
admin_dep = require_roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)

# --- MOVIES ---
@router.get("/movies", response_model=List[MovieOut])
def get_all_movies(db: Session = Depends(get_db), current_user: User = Depends(admin_dep)):
    return db.query(Movie).order_by(Movie.created_at.desc()).all()

@router.post("/movies", response_model=MovieOut)
def create_movie(
    movie_in: MovieCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_dep)
):
    movie = Movie(**movie_in.dict())
    db.add(movie)
    db.commit()
    db.refresh(movie)

    audit = AuditLog(
        actor_id=current_user.id,
        actor_username=current_user.username,
        action="CREATE_MOVIE",
        target_entity="Movie",
        target_id=str(movie.id),
        details=f"Created movie '{movie.title}'"
    )
    db.add(audit)
    db.commit()
    return movie

@router.put("/movies/{movie_id}", response_model=MovieOut)
def update_movie(
    movie_id: int,
    movie_in: MovieCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_dep)
):
    movie = db.query(Movie).filter(Movie.id == movie_id).first()
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")

    for key, val in movie_in.dict().items():
        setattr(movie, key, val)

    audit = AuditLog(
        actor_id=current_user.id,
        actor_username=current_user.username,
        action="UPDATE_MOVIE",
        target_entity="Movie",
        target_id=str(movie.id),
        details=f"Updated movie '{movie.title}'"
    )
    db.add(audit)
    db.commit()
    db.refresh(movie)
    return movie

@router.post("/movies/{movie_id}/publish")
def publish_movie(
    movie_id: int,
    publish: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_dep)
):
    movie = db.query(Movie).filter(Movie.id == movie_id).first()
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")
    movie.is_published = publish
    db.commit()
    return {"message": f"Movie publication state updated to {publish}", "movie_id": movie.id}

# --- SCREENINGS ---
@router.post("/screenings", response_model=ScreeningOut)
def create_screening(
    scr_in: ScreeningCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_dep)
):
    movie = db.query(Movie).filter(Movie.id == scr_in.movie_id).first()
    if not movie:
        raise HTTPException(status_code=404, detail="Referenced movie not found")

    screening = Screening(
        movie_id=scr_in.movie_id,
        screening_date=scr_in.screening_date,
        start_time=scr_in.start_time,
        end_time=scr_in.end_time,
        status="open"
    )
    db.add(screening)
    db.flush()

    # Automatically generate full auditorium seat inventory for this screening
    seats = db.query(Seat).filter(Seat.is_active == True).all()
    inventories = [
        ScreeningSeatInventory(
            screening_id=screening.id,
            seat_id=seat.id,
            status="available"
        )
        for seat in seats
    ]
    db.add_all(inventories)

    audit = AuditLog(
        actor_id=current_user.id,
        actor_username=current_user.username,
        action="CREATE_SCREENING",
        target_entity="Screening",
        target_id=str(screening.id),
        details=f"Created screening for movie ID {screening.movie_id} with {len(inventories)} seats"
    )
    db.add(audit)
    db.commit()
    db.refresh(screening)
    return screening

# --- BATCHES ---
@router.get("/batches", response_model=List[BatchOut])
def get_batches(db: Session = Depends(get_db), current_user: User = Depends(admin_dep)):
    return db.query(Batch).all()

@router.post("/batches", response_model=BatchOut)
def create_batch(
    b_in: BatchCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_dep)
):
    existing = db.query(Batch).filter(Batch.name == b_in.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Batch with this name already exists")

    batch = Batch(name=b_in.name, description=b_in.description)
    db.add(batch)
    db.commit()
    db.refresh(batch)
    return batch

@router.get("/batches/{batch_id}/students", response_model=List[UserOut])
def get_students_by_batch(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_dep)
):
    return db.query(User).filter(User.batch_id == batch_id, User.role == UserRole.STUDENT).all()

# --- NOTIFICATIONS (BATCH-TARGETED) ---
@router.post("/notifications")
def create_batch_notification(
    notif_in: NotificationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_dep)
):
    notif = Notification(
        title=notif_in.title,
        body=notif_in.body,
        creator_id=current_user.id,
        target_all=notif_in.target_all
    )
    db.add(notif)
    db.flush()

    target_users = []
    if notif_in.target_all:
        target_users = db.query(User).filter(User.role == UserRole.STUDENT).all()
    elif notif_in.batch_ids:
        for b_id in notif_in.batch_ids:
            nb = NotificationBatch(notification_id=notif.id, batch_id=b_id)
            db.add(nb)
        target_users = db.query(User).filter(
            User.role == UserRole.STUDENT,
            User.batch_id.in_(notif_in.batch_ids)
        ).all()

    # Create user delivery records
    recipients = [
        NotificationRecipient(notification_id=notif.id, user_id=u.id, is_read=False)
        for u in target_users
    ]
    db.add_all(recipients)

    audit = AuditLog(
        actor_id=current_user.id,
        actor_username=current_user.username,
        action="SEND_NOTIFICATION",
        target_entity="Notification",
        target_id=str(notif.id),
        details=f"Sent to {len(recipients)} students across batches {notif_in.batch_ids}"
    )
    db.add(audit)
    db.commit()

    return {
        "message": "Notification dispatched successfully",
        "notification_id": notif.id,
        "recipients_count": len(recipients)
    }

# --- REPORTS & OVERVIEW ---
@router.get("/analytics")
def get_admin_analytics(db: Session = Depends(get_db), current_user: User = Depends(admin_dep)):
    total_students = db.query(User).filter(User.role == UserRole.STUDENT).count()
    total_teachers = db.query(User).filter(User.role == UserRole.TEACHER).count()
    total_batches = db.query(Batch).filter(Batch.is_active == True).count()
    total_screenings = db.query(Screening).count()
    total_confirmed_bookings = db.query(Booking).filter(Booking.status == BookingStatus.CONFIRMED).count()
    
    # Calculate occupancy rate across all active screenings
    total_inventory = db.query(ScreeningSeatInventory).count()
    booked_inventory = db.query(ScreeningSeatInventory).filter(ScreeningSeatInventory.status == "booked").count()
    occupancy_rate = round((booked_inventory / total_inventory * 100), 2) if total_inventory > 0 else 0.0

    return {
        "total_students": total_students,
        "total_teachers": total_teachers,
        "total_batches": total_batches,
        "total_screenings": total_screenings,
        "total_confirmed_bookings": total_confirmed_bookings,
        "occupancy_rate_percent": occupancy_rate,
        "total_seat_slots": total_inventory,
        "booked_seat_slots": booked_inventory
    }
