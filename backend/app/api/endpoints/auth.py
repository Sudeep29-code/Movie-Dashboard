from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from app.core.database import get_db
from app.core.security import verify_password, create_access_token
from app.models.models import User, AuditLog
from app.schemas.schemas import LoginRequest, Token, UserOut
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/login", response_model=Token)
def login(login_req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == login_req.username).first()
    # Uniform error response to avoid user enumeration
    if not user or not verify_password(login_req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account is deactivated. Please contact administration."
        )

    # Update last login
    user.last_login = datetime.utcnow()
    
    # Audit log
    audit = AuditLog(
        actor_id=user.id,
        actor_username=user.username,
        action="USER_LOGIN",
        target_entity="User",
        target_id=str(user.id),
        details=f"User {user.username} logged in with role {user.role}"
    )
    db.add(audit)
    db.commit()

    token = create_access_token(subject=user.id)
    return Token(
        access_token=token,
        token_type="bearer",
        role=user.role,
        username=user.username,
        display_name=user.display_name,
        user_id=user.id
    )

@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/logout")
def logout(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    audit = AuditLog(
        actor_id=current_user.id,
        actor_username=current_user.username,
        action="USER_LOGOUT",
        target_entity="User",
        target_id=str(current_user.id),
        details="User logged out"
    )
    db.add(audit)
    db.commit()
    return {"message": "Successfully logged out"}
