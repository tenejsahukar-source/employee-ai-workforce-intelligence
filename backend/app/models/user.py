from sqlalchemy import Column, Integer, String, Boolean, DateTime
from datetime import datetime

from app.database.connection import Base


class User(Base):

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    full_name = Column(String)

    email = Column(String, unique=True, index=True)

    hashed_password = Column(String)

    role = Column(String)

    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime, default=datetime.utcnow)