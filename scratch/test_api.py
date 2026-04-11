import requests
import json

url = "http://127.0.0.1:8000/register"
data = {
    "name": "Debug User",
    "email": "debug_user@example.com",
    "password": "password123"
}

try:
    response = requests.post(url, json=data)
    print(f"Status Code: {response.status_code}")
    print(f"Response Body: {response.text}")
except Exception as e:
    print(f"ERROR: {str(e)}")
