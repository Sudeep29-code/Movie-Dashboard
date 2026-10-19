from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.models import User, Notification, NotificationRecipient
from app.schemas.schemas import NotificationOut

router = APIRouter(prefix="/notifications", tags=["notifications"])

@router.get("/me", response_model=List[NotificationOut])
def get_user_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    recipients = db.query(NotificationRecipient).join(
        Notification, NotificationRecipient.notification_id == Notification.id
    ).filter(
        NotificationRecipient.user_id == current_user.id
    ).order_by(Notification.created_at.desc()).all()

    results = []
    for r in recipients:
        results.append(NotificationOut(
            id=r.notification.id,
            title=r.notification.title,
            body=r.notification.body,
            target_all=r.notification.target_all,
            created_at=r.notification.created_at,
            is_read=r.is_read
        ))
    return results

@router.post("/{notification_id}/read")
def mark_notification_as_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    recipient = db.query(NotificationRecipient).filter(
        NotificationRecipient.notification_id == notification_id,
        NotificationRecipient.user_id == current_user.id
    ).first()

    if not recipient:
        raise HTTPException(status_code=404, detail="Notification not found")

    recipient.is_read = True
    recipient.read_at = datetime.utcnow()
    db.commit()

    return {"message": "Notification marked as read", "notification_id": notification_id}
