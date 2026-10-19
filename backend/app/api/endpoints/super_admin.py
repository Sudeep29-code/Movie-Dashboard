from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from app.core.database import get_db
from app.core.security import get_password_hash
from app.api.deps import require_roles
from app.models.models import (
    User, UserRole, AuditLog, SystemConfig, Seat, ScreeningSeatInventory,
    Booking, BookingStatus
)
from app.schemas.schemas import UserCreate, UserUpdate, UserOut, AuditLogOut

router = APIRouter(prefix="/super-admin", tags=["super-admin"])

super_admin_dep = require_roles(UserRole.SUPER_ADMIN)

# --- USER MANAGEMENT ---
@router.get("/users", response_model=List[UserOut])
def get_all_users(
    role: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(super_admin_dep)
):
    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    return query.order_by(User.created_at.desc()).all()

@router.post("/users", response_model=UserOut)
def create_user(
    u_in: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(super_admin_dep)
):
    existing = db.query(User).filter(User.username == u_in.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already registered")

    user = User(
        username=u_in.username,
        password_hash=get_password_hash(u_in.password),
        display_name=u_in.display_name,
        role=u_in.role,
        batch_id=u_in.batch_id,
        is_active=u_in.is_active
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    audit = AuditLog(
        actor_id=current_user.id,
        actor_username=current_user.username,
        action="SUPERADMIN_CREATE_USER",
        target_entity="User",
        target_id=str(user.id),
        details=f"Created user {user.username} with role {user.role}"
    )
    db.add(audit)
    db.commit()

    return user

@router.put("/users/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    u_in: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(super_admin_dep)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Protection: super admin cannot demote themselves accidentally
    if user.id == current_user.id and u_in.role and u_in.role != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=400, detail="Super-admin cannot revoke their own super-admin privileges.")

    if u_in.display_name is not None:
        user.display_name = u_in.display_name
    if u_in.role is not None:
        user.role = u_in.role
    if u_in.batch_id is not None:
        user.batch_id = u_in.batch_id
    if u_in.is_active is not None:
        user.is_active = u_in.is_active
    if u_in.password:
        user.password_hash = get_password_hash(u_in.password)

    audit = AuditLog(
        actor_id=current_user.id,
        actor_username=current_user.username,
        action="SUPERADMIN_UPDATE_USER",
        target_entity="User",
        target_id=str(user.id),
        details=f"Updated properties for user {user.username}"
    )
    db.add(audit)
    db.commit()
    db.refresh(user)

    return user

# --- AUDIT LOGS ---
@router.get("/audit-logs", response_model=List[AuditLogOut])
def get_audit_logs(
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(super_admin_dep)
):
    return db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(limit).all()

# --- ADMINISTRATIVE CORRECTIONS ---
@router.post("/corrections/override-seat-status")
def override_seat_status(
    screening_id: int,
    seat_id: int,
    new_status: str,  # available, blocked, held, booked
    db: Session = Depends(get_db),
    current_user: User = Depends(super_admin_dep)
):
    inv = db.query(ScreeningSeatInventory).filter(
        ScreeningSeatInventory.screening_id == screening_id,
        ScreeningSeatInventory.seat_id == seat_id
    ).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Screening seat inventory not found")

    prev_status = inv.status
    inv.status = new_status
    if new_status == "available":
        inv.held_by_user_id = None
        inv.held_expires_at = None

    audit = AuditLog(
        actor_id=current_user.id,
        actor_username=current_user.username,
        action="OVERRIDE_SEAT_STATUS",
        target_entity="ScreeningSeatInventory",
        target_id=f"{screening_id}-{seat_id}",
        details=f"Overrode seat status from {prev_status} to {new_status}"
    )
    db.add(audit)
    db.commit()

    return {"message": f"Seat status successfully updated to {new_status}"}

# --- SYSTEM CONFIGURATION ---
@router.get("/configs")
def get_system_configs(db: Session = Depends(get_db), current_user: User = Depends(super_admin_dep)):
    return db.query(SystemConfig).all()

@router.post("/configs")
def set_system_config(
    key: str,
    value: str,
    description: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(super_admin_dep)
):
    config = db.query(SystemConfig).filter(SystemConfig.key == key).first()
    if config:
        config.value = value
        if description:
            config.description = description
    else:
        config = SystemConfig(key=key, value=value, description=description)
        db.add(config)

    audit = AuditLog(
        actor_id=current_user.id,
        actor_username=current_user.username,
        action="UPDATE_CONFIG",
        target_entity="SystemConfig",
        target_id=key,
        details=f"Config {key} set to {value}"
    )
    db.add(audit)
    db.commit()
    return {"message": "Configuration saved", "key": key, "value": value}
