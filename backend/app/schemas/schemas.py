from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    username: str
    display_name: str
    user_id: int

class LoginRequest(BaseModel):
    username: str
    password: str

class UserBase(BaseModel):
    username: str
    display_name: str
    role: str
    batch_id: Optional[int] = None
    is_active: bool = True

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    role: Optional[str] = None
    batch_id: Optional[int] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None

class UserOut(UserBase):
    id: int
    created_at: datetime
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True

class BatchCreate(BaseModel):
    name: str
    description: Optional[str] = None

class BatchOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class MovieCreate(BaseModel):
    title: str
    synopsis: str
    poster_url: Optional[str] = None
    trailer_url: Optional[str] = None
    genre: str
    duration_minutes: int
    language: str = "English"
    is_published: bool = False

class MovieOut(MovieCreate):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class ScreeningCreate(BaseModel):
    movie_id: int
    screening_date: datetime
    start_time: str
    end_time: str

class ScreeningOut(BaseModel):
    id: int
    movie_id: int
    screening_date: datetime
    start_time: str
    end_time: str
    status: str
    movie: Optional[MovieOut] = None

    class Config:
        from_attributes = True

class SeatOut(BaseModel):
    id: int
    seat_label: str
    row_label: str
    seat_number: int
    tier: str
    is_active: bool

    class Config:
        from_attributes = True

class ScreeningSeatStatusOut(BaseModel):
    id: int
    seat_id: int
    seat_label: str
    row_label: str
    seat_number: int
    tier: str
    status: str  # available, held, booked, blocked

class BookingCreateRequest(BaseModel):
    screening_id: int
    seat_ids: List[int]

class BookingSeatOut(BaseModel):
    seat_id: int
    seat_label: str
    row_label: str
    seat_number: int
    tier: str

class BookingOut(BaseModel):
    id: int
    booking_reference: str
    user_id: int
    user_name: Optional[str] = None
    screening_id: int
    movie_title: Optional[str] = None
    screening_date: Optional[datetime] = None
    start_time: Optional[str] = None
    status: str
    created_at: datetime
    seats: List[BookingSeatOut] = []

    class Config:
        from_attributes = True

class NotificationCreate(BaseModel):
    title: str
    body: str
    target_all: bool = False
    batch_ids: List[int] = []

class NotificationOut(BaseModel):
    id: int
    title: str
    body: str
    target_all: bool
    created_at: datetime
    is_read: Optional[bool] = False

    class Config:
        from_attributes = True

class AuditLogOut(BaseModel):
    id: int
    actor_username: Optional[str]
    action: str
    target_entity: str
    target_id: Optional[str]
    details: Optional[str]
    timestamp: datetime

    class Config:
        from_attributes = True
