from backend.database import SessionLocal, Job, Email, engine
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import sys
import os

# Add backend to path so imports work
sys.path.append(os.path.join(os.getcwd(), 'backend'))

# Override DB URL to point to backup
DATABASE_URL = "sqlite:///backend/emails.db.bak"
engine_bak = create_engine(DATABASE_URL)
SessionBak = sessionmaker(bind=engine_bak)

def check_jobs():
    db = SessionBak()
    try:
        # Get last 5 jobs
        jobs = db.query(Job).order_by(Job.created_at.desc()).limit(5).all()
        for job in jobs:
            print(f"Job ID: {job.id}")
            print(f"  Status: {job.status}")
            print(f"  Created: {job.created_at}")
            print(f"  Completed: {job.completed_at}")
            print(f"  Progress: {job.processed_emails} / {job.total_emails}")
            
            if job.status == 'FAILED' or job.id == jobs[0].id:
                print("  Last 5 Emails:")
                emails = db.query(Email).filter(Email.job_id == job.id).order_by(Email.id.desc()).limit(5).all()
                for email in emails:
                    print(f"    - {email.email}: {email.status} ({email.reason})")
            print("-" * 20)
            
    except Exception as e:
        print(f"Error querying DB: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_jobs()
