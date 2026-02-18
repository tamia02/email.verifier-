from fastapi import FastAPI, UploadFile, File, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
import shutil
import os
import uuid
import pandas as pd
from typing import List
from database import init_db, create_job, get_job, get_job_results
from jobs import process_csv
from models import JobResponse

app = FastAPI()

# CORS
origins = ["*"]

frontend_url = os.getenv("FRONTEND_URL")
if frontend_url:
    origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Constants
UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

# Initialize DB
init_db()

@app.get("/")
def read_root():
    return {"message": "Email Verifier API is running"}

@app.post("/upload", response_model=JobResponse)
def upload_file(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    print(f"DEBUG_UPLOAD: Received upload request for {file.filename}")
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")
    
    job_id = str(uuid.uuid4())
    file_path = os.path.join(UPLOAD_DIR, f"{job_id}_{file.filename}")
    
    print(f"DEBUG_UPLOAD: Saving file to {file_path}")
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    print(f"DEBUG_UPLOAD: File saved successfully. Size: {os.path.getsize(file_path)} bytes")
    
    # Initial Job Creation (Total emails set to 0, updated in background)
    total_emails = 0
    print(f"DEBUG_UPLOAD: Creating DB entry for job {job_id}")
    create_job(job_id, file.filename, total_emails)
    print(f"DEBUG_UPLOAD: DB entry created.")
    
    # Trigger background task
    background_tasks.add_task(process_csv, job_id, file_path)
    print(f"DEBUG_UPLOAD: Background task scheduled. Returning response.")
    
    return {
        "id": job_id,
        "filename": file.filename,
        "status": "PENDING",
        "total_emails": total_emails,
        "processed_emails": 0,
        "created_at": pd.Timestamp.now().isoformat()
    }

@app.get("/job/{job_id}", response_model=JobResponse)
def get_job_status(job_id: str):
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

@app.get("/job/{job_id}/download/{type}")
def download_results(job_id: str, type: str):
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    results = get_job_results(job_id)
    if not results:
         raise HTTPException(status_code=404, detail="No results found")
    
    # Convert DB results to DataFrame
    results_df = pd.DataFrame(results)
    
    # Path to original file
    original_file_path = os.path.join(UPLOAD_DIR, f"{job_id}_{job['filename']}")
    
    if type == 'cleaned':
        # Logic for Cleaned List: Merge with original data and keep only Valid
        if not os.path.exists(original_file_path):
             raise HTTPException(status_code=404, detail="Original file not found")
        
        try:
            original_df = pd.read_csv(original_file_path)
            
            # Find the email column case-insensitively
            email_col = next((c for c in original_df.columns if c.lower() == 'email'), None)
            
            if not email_col:
                # Fallback: Check if we can find any column containing 'email'
                email_col = next((c for c in original_df.columns if 'email' in c.lower()), None)
            
            if not email_col:
                 raise HTTPException(status_code=400, detail="Could not identify email column in original file")

            # Normalize email column for merging
            original_df['email_lower'] = original_df[email_col].astype(str).str.lower().str.strip()
            results_df['email_lower'] = results_df['email'].astype(str).str.lower().str.strip()
            
            # Merge
            merged_df = pd.merge(original_df, results_df[['email_lower', 'status', 'reason']], on='email_lower', how='left')
            
            # Filter for VALID emails
            cleaned_df = merged_df[merged_df['status'] == 'VALID'].copy()
            
            # Cleanup helper columns
            if 'email_lower' in cleaned_df.columns:
                cleaned_df = cleaned_df.drop(columns=['email_lower'])
            
            # Output
            output_file = os.path.join(UPLOAD_DIR, f"{job_id}_cleaned.csv")
            cleaned_df.to_csv(output_file, index=False)
            return FileResponse(output_file, media_type='text/csv', filename=f"cleaned_{job['filename']}")

        except Exception as e:
            print(f"Error generating cleaned list: {e}")
            raise HTTPException(status_code=500, detail="Error generating cleaned list")

    else:
        # Standard segmented downloads (results only)
        df = results_df
        
        # Segment data
        if type == 'valid':
            filtered_df = df[df['status'] == 'VALID']
        elif type == 'invalid':
            filtered_df = df[df['status'] == 'INVALID']
        elif type == 'catch_all':
            filtered_df = df[df['catch_all'] == 1]
        elif type == 'risky':
            # Risky = Unknown + Catch All
            filtered_df = df[(df['status'] == 'UNKNOWN') | (df['catch_all'] == 1)]
        else: # all
            filtered_df = df
            
        output_file = os.path.join(UPLOAD_DIR, f"{job_id}_{type}.csv")
        filtered_df.to_csv(output_file, index=False)
        
        return FileResponse(output_file, media_type='text/csv', filename=f"{type}_emails.csv")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
