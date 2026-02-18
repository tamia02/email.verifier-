import pandas as pd
import asyncio
from typing import List
from verifier import EmailVerifier
from database import update_job_status, update_job_progress, save_email_result, update_job_total
import logging


# Configure logging to stdout so it shows up in Render logs
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def process_csv(job_id: str, file_path: str):
    """
    Background task to process the CSV file.
    """
    logger.info(f"STARTING JOB EXECUTION: {job_id} for file {file_path}")
    print(f"DEBUG_JOBS: Starting job {job_id}")
    
    try:
        update_job_status(job_id, "PROCESSING")
    
        verifier = EmailVerifier()
        # Read just the header first to find the email column
        # This avoids loading the entire huge file into memory if we just need one column
        df_header = pd.read_csv(file_path, nrows=0)
        
        # Normalize headers to map {clean_name: original_name}
        # e.g. {'email': 'Email', 'fullname': 'fullName'}
        header_map = {c.lower().strip(): c for c in df_header.columns}
        print(f"DEBUG: File Headers Detected: {list(header_map.keys())}")
        
        # Try to find 'email'
        email_col_name = header_map.get('email')
        
        # Fallback: look for any column containing 'email'
        if not email_col_name:
             for clean, original in header_map.items():
                 if 'email' in clean:
                     email_col_name = original
                     break
        
        if not email_col_name:
            print(f"FAILED: Job {job_id} - No email column found in {list(header_map.keys())}")
            logger.error(f"Job {job_id} failed: No 'email' column found in {list(header_map.keys())}")
            update_job_status(job_id, "FAILED")
            return

        # Now read ONLY the email column
        print(f"DEBUG: Found email column '{email_col_name}' in {file_path}")
        logger.info(f"Reading column '{email_col_name}' from {file_path}")
        
        # OFF-LOAD BLOCKING I/O TO THREAD
        print(f"DEBUG: Attempting to read CSV {file_path} with column {email_col_name}")
        try:
            # Try reading with default encoding
            df = await asyncio.to_thread(pd.read_csv, file_path, usecols=[email_col_name])
        except UnicodeDecodeError:
            print(f"DEBUG: Default encoding failed, trying utf-8-sig")
            # Fallback for Excel-saved CSVs
            df = await asyncio.to_thread(pd.read_csv, file_path, usecols=[email_col_name], encoding='utf-8-sig')
        except Exception as read_err:
             print(f"CRITICAL: Failed to read CSV file: {read_err}")
             raise read_err
        
        # Standardize the column name in our dataframe to 'email' for internal use
        df = df.rename(columns={email_col_name: 'email'})

        emails = df['email'].astype(str).tolist()
        total = len(emails)
        
        print(f"DEBUG: Job {job_id} - Total emails to process: {total}")

        # Update total count in DB now that we've parsed it
        update_job_total(job_id, total)
        
        # Chunk processing to allow for some concurrency control
        # We can use asyncio.gather for concurrency
        BATCH_SIZE = 50 # Increased concurrency limit for faster processing
        
        for i in range(0, total, BATCH_SIZE):
            batch = emails[i : i + BATCH_SIZE]
            tasks = [verifier.verify(email) for email in batch]
            results = await asyncio.gather(*tasks)
            
            for res in results:
                save_email_result(job_id, res)
            
            # Update progress
            processed = min(i + BATCH_SIZE, total)
            
            # Log a sample result for debugging
            if results:
                 sample = results[0]
                 print(f"DEBUG: Sample Result for {sample['email']}: {sample['status']} - {sample.get('reason')}")
            
            print(f"DEBUG: Job {job_id} progress: {processed}/{total}")
            update_job_progress(job_id, processed)
            
        update_job_status(job_id, "COMPLETED")
        logger.info(f"Job {job_id} completed")

    except Exception as e:
        logger.error(f"CRITICAL ERROR in job {job_id}: {e}", exc_info=True)
        print(f"DEBUG_JOBS: Job {job_id} failed with error: {e}")
        update_job_status(job_id, "FAILED")
