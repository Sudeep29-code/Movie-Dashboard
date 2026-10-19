from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from app.core.database import get_db
from app.models.models import Movie, Screening, ScreeningSeatInventory, Seat, SeatStatus
from app.schemas.schemas import MovieOut, ScreeningOut, ScreeningSeatStatusOut

router = APIRouter(prefix="/public", tags=["public"])

@router.get("/movies/current", response_model=Optional[MovieOut])
def get_current_movie(db: Session = Depends(get_db)):
    movie = db.query(Movie).filter(Movie.is_published == True).order_by(Movie.updated_at.desc()).first()
    return movie

@router.get("/movies", response_model=List[MovieOut])
def get_published_movies(db: Session = Depends(get_db)):
    return db.query(Movie).filter(Movie.is_published == True).order_by(Movie.created_at.desc()).all()

@router.get("/screenings", response_model=List[ScreeningOut])
def get_public_screenings(movie_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(Screening).join(Movie).filter(Movie.is_published == True, Screening.status == "open")
    if movie_id:
        query = query.filter(Screening.movie_id == movie_id)
    return query.order_by(Screening.screening_date.asc()).all()

@router.get("/screenings/{screening_id}/seats", response_model=List[ScreeningSeatStatusOut])
def get_public_seat_availability(screening_id: int, db: Session = Depends(get_db)):
    screening = db.query(Screening).filter(Screening.id == screening_id).first()
    if not screening:
        raise HTTPException(status_code=404, detail="Screening not found")

    inventories = db.query(ScreeningSeatInventory, Seat).join(
        Seat, ScreeningSeatInventory.seat_id == Seat.id
    ).filter(
        ScreeningSeatInventory.screening_id == screening_id
    ).order_by(Seat.row_label.asc(), Seat.seat_number.asc()).all()

    # Expire stale holds dynamically
    now = datetime.utcnow()
    results = []
    has_expired = False
    for inv, seat in inventories:
        current_status = inv.status
        if current_status == SeatStatus.HELD and inv.held_expires_at and inv.held_expires_at < now:
            inv.status = SeatStatus.AVAILABLE
            inv.held_by_user_id = None
            inv.held_expires_at = None
            current_status = SeatStatus.AVAILABLE
            has_expired = True

        results.append(ScreeningSeatStatusOut(
            id=inv.id,
            seat_id=seat.id,
            seat_label=seat.seat_label,
            row_label=seat.row_label,
            seat_number=seat.seat_number,
            tier=seat.tier,
            status=current_status
        ))

    if has_expired:
        db.commit()

    return results

@router.get("/screenings/{screening_id}/stats")
def get_screening_stats(screening_id: int, db: Session = Depends(get_db)):
    screening = db.query(Screening).filter(Screening.id == screening_id).first()
    if not screening:
        raise HTTPException(status_code=404, detail="Screening not found")

    total_seats = db.query(ScreeningSeatInventory).filter(ScreeningSeatInventory.screening_id == screening_id).count()
    booked_seats = db.query(ScreeningSeatInventory).filter(
        ScreeningSeatInventory.screening_id == screening_id,
        ScreeningSeatInventory.status == SeatStatus.BOOKED
    ).count()
    held_seats = db.query(ScreeningSeatInventory).filter(
        ScreeningSeatInventory.screening_id == screening_id,
        ScreeningSeatInventory.status == SeatStatus.HELD
    ).count()
    available_seats = total_seats - booked_seats - held_seats

    return {
        "screening_id": screening_id,
        "total_seats": total_seats,
        "booked_seats": booked_seats,
        "held_seats": held_seats,
        "available_seats": max(0, available_seats)
    }
