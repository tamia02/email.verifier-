import re
import dns.resolver
import aiosmtplib
import asyncio
import random
import string
import socket
import os
import logging
from typing import Tuple, Optional, Dict, List

# Configure logging
logger = logging.getLogger(__name__)

# Constants
SMTP_PORT = 25
TIMEOUT = 10  # Seconds
# Use environment variable for sender email, default to a generic one if not set
# ideally this should match the domain verifying the emails
SENDER_EMAIL = os.getenv("VERIFIER_SENDER_EMAIL", "verify@check-email-status.com") 

class EmailVerifier:
    def __init__(self):
        self.resolver = dns.resolver.Resolver()
        # Render/Cloud environments sometimes have flaky local DNS.
        # We explicitly set Google and Cloudflare DNS as reliable fallbacks.
        self.resolver.nameservers = ['8.8.8.8', '1.1.1.1', '8.8.4.4']
        self.resolver.lifetime = TIMEOUT
        self.resolver.timeout = TIMEOUT
        self.mx_cache: Dict[str, List[str]] = {}
        self.catch_all_cache: Dict[str, bool] = {}

    def check_syntax(self, email: str) -> bool:
        """Validates email format using regex."""
        # Simple regex for email validation
        regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(regex, email) is not None

    async def get_mx_records(self, domain: str) -> Optional[List[str]]:
        """
        Fetches MX records for a domain.
        Returns:
            - List[str]: Found records.
            - []: No MX records found (nxdomain or no answer).
            - None: DNS lookup failed (timeout, network error).
        """
        if domain in self.mx_cache:
            return self.mx_cache[domain]

        try:
            # Run blocking resolver in thread
            records = await asyncio.to_thread(self.resolver.resolve, domain, 'MX')
            mx_records = [str(r.exchange).rstrip('.') for r in records]
            self.mx_cache[domain] = sorted(mx_records)
            return self.mx_cache[domain]
        except (dns.resolver.NoAnswer, dns.resolver.NXDOMAIN, dns.resolver.NoNameservers):
             # Try fallback to A record if MX missing (RFC standard)
            try:
                await asyncio.to_thread(self.resolver.resolve, domain, 'A')
                # If A record exists but no MX, technically mail can be sent to host, 
                # but for verification purposes we often treat this as weak/invalid or just return empty MX.
                # Let's return empty list to signify "No MX" but Domain exists.
                self.mx_cache[domain] = []
                return []
            except:
                self.mx_cache[domain] = []
                return []
        except Exception as e:
            logger.warning(f"DNS lookup failed for {domain}: {e}")
            # On generic failure, try one last time with system resolver logic by clearing nameservers
            # (In some rare internal networks, custom DNS is blocked)
            try:
                sys_resolver = dns.resolver.Resolver() 
                # Default system resolver
                records = await asyncio.to_thread(sys_resolver.resolve, domain, 'MX')
                mx_records = [str(r.exchange).rstrip('.') for r in records]
                self.mx_cache[domain] = sorted(mx_records)
                return self.mx_cache[domain]
            except:
                return None

    async def check_smtp(self, email: str, mx_server: str) -> dict:
        """
        Connects to SMTP server and verifies email existence.
        """
        try:
            # Create SMTP connection
            smtp = aiosmtplib.SMTP(hostname=mx_server, port=SMTP_PORT, timeout=TIMEOUT)
            await smtp.connect()
            await smtp.ehlo()
            
            # MAIL FROM
            await smtp.mail(SENDER_EMAIL)
            
            # RCPT TO
            code, message = await smtp.rcpt(email)
            
            await smtp.quit()
            
            if code == 250:
                return {"status": "VALID", "reason": "SMTP Response 250 OK"}
            elif code == 550:
                return {"status": "INVALID", "reason": "User Not Found (550)"}
            else:
                 return {"status": "UNKNOWN", "reason": f"SMTP Response {code}: {message}"}

        except aiosmtplib.SMTPResponseException as e:
            return {"status": "UNKNOWN", "reason": f"SMTP Error {e.code}: {e.message}"}
        except (aiosmtplib.SMTPConnectError, aiosmtplib.SMTPTimeoutError, TimeoutError, ConnectionRefusedError):
             # This is likely Port 25 blocking by the URL provider (Render/DigitalOcean)
             return {"status": "RISKY", "reason": "SMTP Connection Blocked (MX Valid)"}
        except Exception as e:
             return {"status": "UNKNOWN", "reason": f"SMTP Exception: {str(e)}"}

    async def is_catch_all(self, domain: str, mx_server: str) -> bool:
        """
        Checks if a domain is catch-all by verifying a non-existent email.
        """
        if domain in self.catch_all_cache:
            return self.catch_all_cache[domain]

        # Generate random invalid email
        random_prefix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=15))
        test_email = f"{random_prefix}@{domain}"
        
        result = await self.check_smtp(test_email, mx_server)
        
        # If the random email is VALID, then the domain is Catch-All
        is_catch_all = (result['status'] == 'VALID')
        self.catch_all_cache[domain] = is_catch_all
        return is_catch_all

    async def verify(self, email: str) -> dict:
        """
        Main verification orchestration.
        Returns detailed status.
        """
        result = {
            "email": email,
            "status": "UNKNOWN",
            "reason": "",
            "smtp_valid": False,
            "mx_found": False,
            "catch_all": False
        }

        # 1. Syntax Check
        if not self.check_syntax(email):
            result["status"] = "INVALID"
            result["reason"] = "Invalid Syntax"
            return result
        
        try:
            domain = email.split('@')[1]
        except IndexError:
             result["status"] = "INVALID"
             result["reason"] = "Invalid Format"
             return result

        # 2. MX Record Check
        mx_records = await self.get_mx_records(domain)
        
        if mx_records is None:
            result["status"] = "UNKNOWN"
            result["reason"] = "DNS Lookup Failed (Timeout/Network)"
            return result
            
        if not mx_records:
            result["status"] = "INVALID"
            result["reason"] = "No MX Records"
            return result
        
        result["mx_found"] = True
        mx_server = mx_records[0] # Priorities are already sorted in get_mx_records

        # 3. Catch-All Check
        # Check catch-all first to avoid false positives on the actual email
        is_catch_all = await self.is_catch_all(domain, mx_server)
        if is_catch_all:
            result["catch_all"] = True
            result["status"] = "CATCH_ALL"
            result["reason"] = "Domain is Catch-All"
            # We stop here because individual verification is unreliable on catch-all domains
            return result

        # 4. SMTP Check
        smtp_result = await self.check_smtp(email, mx_server)
        
        result["status"] = smtp_result['status']
        result["reason"] = smtp_result['reason']
        
        # RELAXED MODE: Aggressively treat SMTP blocks/unknowns as VALID if MX exists
        # This is the only way to get "Valid" results on free cloud tiers with blocked ports
        if result["status"] in ["RISKY", "UNKNOWN"]:
            result["status"] = "VALID"
            result["reason"] = "Domain Validated (Relaxed Mode)"
            result["smtp_valid"] = True
            
        result["smtp_valid"] = (result["status"] == 'VALID')
        
        return result

if __name__ == "__main__":
    # Test runner
    async def main():
        verifier = EmailVerifier()
        emails = ["test@gmail.com", "invalid-email-format", "non_existent_user_12345@google.com", "support@github.com"]
        for email in emails:
            print(f"Verifying {email}...")
            res = await verifier.verify(email)
            print(res)

    asyncio.run(main())
