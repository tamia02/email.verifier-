from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from enum import Enum

class JobStatus(str, Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"

class Job(BaseModel):
    id: str
    filename: str
    status: JobStatus
    total_emails: int
    processed_emails: int
    created_at: datetime
    completed_at: Optional[datetime] = None

class EmailResult(BaseModel):
    email: str
    status: str
    reason: Optional[str] = None
    smtp_valid: bool = False
    mx_found: bool = False
    catch_all: bool = False

class JobResponse(Job):
    pass
