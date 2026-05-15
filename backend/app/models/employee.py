from sqlalchemy import Column, Integer, String, Float, DateTime
from datetime import datetime

from app.database.connection import Base


class Employee(Base):

    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)

    employee_id = Column(String, unique=True)

    name = Column(String)

    email = Column(String, unique=True)

    department = Column(String)

    role = Column(String)

    salary = Column(Float)

    experience_years = Column(Float)

    attendance_rate = Column(Float)

    projects_completed = Column(Integer)

    performance_score = Column(Float)

    stress_level = Column(Float)

    created_at = Column(DateTime, default=datetime.utcnow)