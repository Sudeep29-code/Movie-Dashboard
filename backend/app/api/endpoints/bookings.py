import uuid
from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.api.deps import get_current_user
from app.models.models import (
    User, UserRole, Screening, ScreeningSeatInventory, Seat,
    SeatStatus, Booking, BookingSeat, BookingStatus, AuditLog
)
from app.schemas.schemas import BookingCreateRequest, BookingOut, BookingSeatOut

router = APIRouter(prefix="/bookings", tags=["bookings"])

@router.post("", response_model=BookingOut)
def create_booking(
    req: BookingCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not req.seat_ids:
        raise HTTPException(status_code=400, detail="No seats requested for booking.")

    # Rule 1: Student role restriction: at most 1 seat per screening
    if current_user.role == UserRole.STUDENT:
        if len(req.seat_ids) > 1:
            raise HTTPException(
                status_code=400,
                detail="Students are permitted to book at most one seat per screening."
            )
        # Check if student already has an active booking for this screening
        existing_booking = db.query(Booking).filter(
            Booking.user_id == current_user.id,
            Booking.screening_id == req.screening_id,
            Booking.status == BookingStatus.CONFIRMED
        ).first()
        if existing_booking:
            raise HTTPException(
                status_code=400,
                detail="You have already booked a seat for this screening."
            )

    # Rule 2: Teacher role restriction: check configured max seats limit
    elif current_user.role == UserRole.TEACHER:
        if len(req.seat_ids) > settings.TEACHER_MAX_SEATS:
            raise HTTPException(
                status_code=400,
                detail=f"Teachers can book a maximum of {settings.TEACHER_MAX_SEATS} seats per booking."
            )

    # Validate Screening existence and status
    screening = db.query(Screening).filter(Screening.id == req.screening_id).first()
    if not screening:
        raise HTTPException(status_code=404, detail="Screening not found.")
    if screening.status != "open":
        raise HTTPException(status_code=400, detail="Booking for this screening is currently closed.")

    # Concurrency safe seat locking: fetch inventories with row selection
    # Using transaction block
    try:
        # Check all requested seats in inventory
        inventories = db.query(ScreeningSeatInventory).filter(
            ScreeningSeatInventory.screening_id == req.screening_id,
            ScreeningSeatInventory.seat_id.in_(req.seat_ids)
        ).with_for_update().all()

        if len(inventories) != len(req.seat_ids):
            raise HTTPException(
                status_code=400,
                detail="One or more selected seats do not exist in the screening inventory."
            )

        now = datetime.utcnow()
        # Verify all seats are available
        for inv in inventories:
            # Check for stale hold
            if inv.status == SeatStatus.HELD and inv.held_expires_at and inv.held_expires_at < now:
                inv.status = SeatStatus.AVAILABLE
                inv.held_by_user_id = None
                inv.held_expires_at = None

            if inv.status != SeatStatus.AVAILABLE:
                # Retrieve label for clear error
                seat_obj = db.query(Seat).filter(Seat.id == inv.seat_id).first()
                label = seat_obj.seat_label if seat_obj else str(inv.seat_id)
                raise HTTPException(
                    status_code=409,
                    detail=f"Seat {label} is no longer available (currently {inv.status})."
                )

        # Mark all seats as booked
        for inv in inventories:
            inv.status = SeatStatus.BOOKED
            inv.held_by_user_id = None
            inv.held_expires_at = None

        # Create booking record
        booking_ref = f"BK-{uuid.uuid4().hex[:8].upper()}"
        booking = Booking(
            booking_reference=booking_ref,
            user_id=current_user.id,
            screening_id=req.screening_id,
            status=BookingStatus.CONFIRMED
        )
        db.add(booking)
        db.flush()  # to obtain booking.id

        # Associate booking seats
        for seat_id in req.seat_ids:
            b_seat = BookingSeat(booking_id=booking.id, seat_id=seat_id)
            db.add(b_seat)

        # Audit log
        audit = AuditLog(
            actor_id=current_user.id,
            actor_username=current_user.username,
            action="CREATE_BOOKING",
            target_entity="Booking",
            target_id=str(booking.id),
            details=f"Booked seats {[inv.seat_id for inv in inventories]} for screening {req.screening_id}"
        )
        db.add(audit)
        db.commit()
        db.refresh(booking)

        # Assemble output
        seats_out = []
        for seat_id in req.seat_ids:
            s_obj = db.query(Seat).filter(Seat.id == seat_id).first()
            if s_obj:
                seats_out.append(BookingSeatOut(
                    seat_id=s_obj.id,
                    seat_label=s_obj.seat_label,
                    row_label=s_obj.row_label,
                    seat_number=s_obj.seat_number,
                    tier=s_obj.tier
                ))

        return BookingOut(
            id=booking.id,
            booking_reference=booking.booking_reference,
            user_id=booking.user_id,
            user_name=current_user.display_name,
            screening_id=booking.screening_id,
            movie_title=screening.movie.title if screening.movie else None,
            screening_date=screening.screening_date,
            start_time=screening.start_time,
            status=booking.status,
            created_at=booking.created_at,
            seats=seats_out
        )

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"An unexpected error occurred while processing the reservation: {str(e)}"
        )

@router.get("/me", response_model=List[BookingOut])
def get_my_bookings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    bookings = db.query(Booking).filter(
        Booking.user_id == current_user.id
    ).order_by(Booking.created_at.desc()).all()

    result = []
    for b in bookings:
        seats_out = []
        for bs in b.seats:
            if bs.seat:
                seats_out.append(BookingSeatOut(
                    seat_id=bs.seat.id,
                    seat_label=bs.seat.seat_label,
                    row_label=bs.seat.row_label,
                    seat_number=bs.seat.seat_number,
                    tier=bs.seat.tier
                ))
        result.append(BookingOut(
            id=b.id,
            booking_reference=b.booking_reference,
            user_id=b.user_id,
            user_name=current_user.display_name,
            screening_id=b.screening_id,
            movie_title=b.screening.movie.title if b.screening and b.screening.movie else None,
            screening_date=b.screening.screening_date if b.screening else None,
            start_time=b.screening.start_time if b.screening else None,
            status=b.status,
            created_at=b.created_at,
            seats=seats_out
        ))
    return result

@router.get("/{booking_id}", response_model=BookingOut)
def get_booking_by_id(
    booking_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found.")

    # Restrict users to their own booking unless Admin/SuperAdmin
    if booking.user_id != current_user.id and current_user.role not in [UserRole.ADMIN, UserRole.SUPER_ADMIN]:
        raise HTTPException(status_code=403, detail="Forbidden. You do not own this booking.")

    seats_out = [
        BookingSeatOut(
            seat_id=bs.seat.id,
            seat_label=bs.seat.seat_label,
            row_label=bs.seat.row_label,
            seat_number=bs.seat.seat_number,
            tier=bs.seat.tier
        ) for bs in booking.seats if bs.seat
    ]

    return BookingOut(
        id=booking.id,
        booking_reference=booking.booking_reference,
        user_id=booking.user_id,
        user_name=booking.user.display_name if booking.user else None,
        screening_id=booking.screening_id,
        movie_title=booking.screening.movie.title if booking.screening and booking.screening.movie else None,
        screening_date=booking.screening.screening_date if booking.screening else None,
        start_time=booking.screening.start_time if booking.screening else None,
        status=booking.status,
        created_at=booking.created_at,
        seats=seats_out
    )

@router.post("/{booking_id}/cancel")
def cancel_booking(
    booking_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found.")

    if booking.user_id != current_user.id and current_user.role not in [UserRole.ADMIN, UserRole.SUPER_ADMIN]:
        raise HTTPException(status_code=403, detail="Forbidden. You do not own this booking.")

    if booking.status == BookingStatus.CANCELLED:
        raise HTTPException(status_code=400, detail="Booking is already cancelled.")

    try:
        # Mark booking cancelled
        booking.status = BookingStatus.CANCELLED

        # Release seats in screening inventory
        seat_ids = [bs.seat_id for bs in booking.seats]
        inventories = db.query(ScreeningSeatInventory).filter(
            ScreeningSeatInventory.screening_id == booking.screening_id,
            ScreeningSeatInventory.seat_id.in_(seat_ids)
        ).all()

        for inv in inventories:
            inv.status = SeatStatus.AVAILABLE
            inv.held_by_user_id = None
            inv.held_expires_at = None

        audit = AuditLog(
            actor_id=current_user.id,
            actor_username=current_user.username,
            action="CANCEL_BOOKING",
            target_entity="Booking",
            target_id=str(booking.id),
            details=f"Booking {booking.booking_reference} cancelled, released {len(seat_ids)} seats."
        )
        db.add(audit)
        db.commit()

        return {"message": "Booking successfully cancelled and seats released.", "booking_id": booking.id}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to cancel booking: {str(e)}")
