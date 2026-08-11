import sys
import asyncio
from fastapi.testclient import TestClient
from app.main import app

def run_tests():
    client = TestClient(app)
    
    # 1. Health
    res = client.get("/health")
    print(f"Health: {res.status_code}")
    
    # 2. Real Insert
    payload = {
        "problemSlug": "two-sum",
        "problemTitle": "Two Sum",
        "status": "accepted",
        "source": "leetcode",
        "sourceCode": "class Solution:\n    pass",
        "submittedAt": "2026-08-10T00:00:00Z",
        "submissionId": "leethub-phase3-test-001"
    }
    
    res1 = client.post("/api/v1/leetcode/submissions", json=payload)
    print(f"Insert 1: Status={res1.status_code} Response={res1.json()}")
    
    # 3. Duplicate
    res2 = client.post("/api/v1/leetcode/submissions", json=payload)
    print(f"Insert 2: Status={res2.status_code} Response={res2.json()}")

if __name__ == "__main__":
    run_tests()
