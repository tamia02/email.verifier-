import os
from sqlalchemy import create_engine, Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import sessionmaker, relationship, declarative_base
from datetime import datetime

# Database URL Handling
# DigitalOcean App Platform provides DATABASE_URL for Postgres.
# Local fallback is SQLite.
# Note: SQLAlchemy requires 'postgresql://' but some providers give 'postgres://'.
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./emails.db")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# SQLAlchemy Setup
connect_args = {"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# ORM Models
class Job(Base):
    __tablename__ = "jobs"

    id = Column(String, primary_key=True, index=True)
    filename = Column(String)
    status = Column(String, default="PENDING")
    total_emails = Column(Integer, default=0)
    processed_emails = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    emails = relationship("Email", back_populates="job", cascade="all, delete-orphan")

class Email(Base):
    __tablename__ = "emails"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(String, ForeignKey("jobs.id"))
    email = Column(String, index=True)
    status = Column(String)
    reason = Column(String, nullable=True)
    smtp_valid = Column(Boolean, default=False)
    mx_found = Column(Boolean, default=False)
    catch_all = Column(Boolean, default=False)

    job = relationship("Job", back_populates="emails")

# Helper to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Core Functions (Matching original interface)

def init_db():
    # Create tables
    Base.metadata.create_all(bind=engine)

def create_job(job_id: str, filename: str, total_emails: int):
    db = SessionLocal()
    try:
        new_job = Job(
            id=job_id,
            filename=filename,
            total_emails=total_emails,
            created_at=datetime.utcnow(),
            status="PENDING",
            processed_emails=0
        )
        db.add(new_job)
        db.commit()
    finally:
        db.close()

def update_job_status(job_id: str, status: str):
    db = SessionLocal()
    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        if job:
            job.status = status
            if status in ["COMPLETED", "FAILED", "CANCELLED"]:
                job.completed_at = datetime.utcnow()
            db.commit()
    finally:
        db.close()

def update_job_progress(job_id: str, processed_count: int):
    db = SessionLocal()
    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        if job:
            job.processed_emails = processed_count
            db.commit()
    finally:
        db.close()

def update_job_total(job_id: str, total: int):
    db = SessionLocal()
    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        if job:
            job.total_emails = total
            db.commit()
    finally:
        db.close()

def save_email_result(job_id: str, result: dict):
    db = SessionLocal()
    try:
        new_email = Email(
            job_id=job_id,
            email=result['email'],
            status=result['status'],
            reason=result.get('reason'),
            smtp_valid=bool(result.get('smtp_valid', False)),
            mx_found=bool(result.get('mx_found', False)),
            catch_all=bool(result.get('catch_all', False))
        )
        db.add(new_email)
        db.commit()
    finally:
        db.close()

def get_job(job_id: str):
    db = SessionLocal()
    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        if job:
            # Convert to dict for compatibility
            return {
                "id": job.id,
                "filename": job.filename,
                "status": job.status,
                "total_emails": job.total_emails,
                "processed_emails": job.processed_emails,
                "created_at": job.created_at,
                "completed_at": job.completed_at
            }
        return None
    finally:
        db.close()

def get_job_results(job_id: str):
    db = SessionLocal()
    try:
        emails = db.query(Email).filter(Email.job_id == job_id).all()
        # Convert to list of dicts
        return [
            {
                "email": e.email,
                "status": e.status,
                "reason": e.reason,
                "smtp_valid": e.smtp_valid,
                "mx_found": e.mx_found,
                "catch_all": e.catch_all
            }
            for e in emails
        ]
    finally:
        db.close()
