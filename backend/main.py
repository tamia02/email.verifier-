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
        # Logic for Cleaned List: Return original rows where status is VALID
        output_file = os.path.join(UPLOAD_DIR, f"{job_id}_cleaned.csv")
        
        if not os.path.exists(original_file_path):
             raise HTTPException(status_code=404, detail="Original file not found")
        
        try:
            # multiple encodings to handle various CSV types
            try:
                original_df = pd.read_csv(original_file_path, encoding='utf-8')
            except UnicodeDecodeError:
                original_df = pd.read_csv(original_file_path, encoding='latin-1')

            # normalize column names for search
            original_columns = original_df.columns.tolist()
            
            # Find the email column
            email_col = None
            for col in original_columns:
                if 'email' in col.lower() or 'e-mail' in col.lower() or 'mail' in col.lower():
                    email_col = col
                    break
            
            if not email_col:
                # If no clear email column, assume first column? Or fail?
                # Let's try to assume the column with largest number of '@' symbols
                max_at_count = 0
                for col in original_columns:
                    if original_df[col].dtype == 'object':
                        at_count = original_df[col].str.count('@').sum()
                        if at_count > max_at_count:
                            max_at_count = at_count
                            email_col = col

            if not email_col:
                 raise HTTPException(status_code=400, detail="Could not identify email column in original file")

            # Prepare for merge
            # Create a normalized temporary column for joining
            original_df['_email_normalized'] = original_df[email_col].astype(str).str.lower().str.strip()
            results_df['_email_normalized'] = results_df['email'].astype(str).str.lower().str.strip()
            
            # Merge to get status
            merged_df = pd.merge(original_df, results_df[['_email_normalized', 'status']], on='_email_normalized', how='left')
            
            # Filter: Keep ONLY valid emails
            cleaned_df = merged_df[merged_df['status'] == 'VALID'].copy()
            
            # Drop the helper columns and the status column (since user just wants original format)
            cleaned_df = cleaned_df.drop(columns=['_email_normalized', 'status'])
            
            # Save
            cleaned_df.to_csv(output_file, index=False)
            return FileResponse(output_file, media_type='text/csv', filename=f"cleaned_{job['filename']}")

        except Exception as e:
            print(f"Error generating cleaned list: {e}")
            raise HTTPException(status_code=500, detail=f"Error generating cleaned list: {str(e)}")

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
    # Increased keep-alive to preventing premature closing on slow networks
    uvicorn.run(app, host="0.0.0.0", port=port, timeout_keep_alive=120)
