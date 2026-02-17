import socket
import dns.resolver
import sys

def test_dns():
    print("Testing OS Resolver (socket.gethostbyname)...")
    try:
        ip = socket.gethostbyname("google.com")
        print(f"SUCCESS: google.com -> {ip}")
    except Exception as e:
        print(f"FAIL: socket.gethostbyname: {e}")

    print("\nTesting dnspython A record (dns.resolver)...")
    try:
        resolver = dns.resolver.Resolver()
        print(f"Resolver configuration: {resolver.nameservers}")
        answer = resolver.resolve("google.com", "A")
        print(f"SUCCESS: google.com -> {[str(x) for x in answer]}")
    except Exception as e:
        print(f"FAIL: dnspython A record: {e}")

    print("\nTesting dnspython MX record (dns.resolver)...")
    try:
        resolver = dns.resolver.Resolver()
        answer = resolver.resolve("google.com", "MX")
        print(f"SUCCESS: google.com MX -> {[str(x) for x in answer]}")
    except Exception as e:
        print(f"FAIL: dnspython MX record: {e}")

if __name__ == "__main__":
    test_dns()
