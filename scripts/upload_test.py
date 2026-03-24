import requests
import time
import os

def test_upload_and_status():
    file_path = "test_verify.csv"
    url = "http://localhost:8000/upload"
    
    print(f"Uploading {file_path} to {url}...")
    with open(file_path, "rb") as f:
        files = {"file": (file_path, f, "text/csv")}
        response = requests.post(url, files=files)
    
    if response.status_code != 200:
        print(f"Upload FAILED: {response.status_code} - {response.text}")
        return

    job = response.json()
    job_id = job["id"]
    print(f"Upload SUCCESS: Job ID is {job_id}")
    
    status_url = f"http://localhost:8000/job/{job_id}"
    print(f"Polling status at {status_url}...")
    
    for _ in range(30): # Poll for up to 60 seconds
        res = requests.get(status_url)
        if res.status_code == 200:
            job_data = res.json()
            print(f"Status: {job_data['status']} | Processed: {job_data['processed_emails']}/{job_data['total_emails']}")
            print(f"Counts: Valid={job_data['valid_emails']}, Invalid={job_data['invalid_emails']}, Catch-All={job_data['catch_all_emails']}, Risky={job_data['risky_emails']}")
            
            if job_data["status"] == "COMPLETED":
                print("Verification SUCCESS: Job completed and counts are present!")
                if job_data['valid_emails'] > 0:
                    print("Counts are NOT zero. Fix verified.")
                else:
                    print("WARNING: Counts are still zero. Fix may have failed.")
                return
            elif job_data["status"] == "FAILED":
                 print("Verification FAILED: Job failed on server.")
                 return
        else:
            print(f"Error polling status: {res.status_code}")
        
        time.sleep(2)
    
    print("Verification TIMEOUT: Job did not complete in time.")

if __name__ == "__main__":
    test_upload_and_status()
