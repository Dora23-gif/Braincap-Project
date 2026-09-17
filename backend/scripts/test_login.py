import os
import sys

current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
sys.path.insert(0, backend_dir)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django
django.setup()

from django.test import Client
import json

c = Client()
response = c.post(
    "/api/v1/accounts/login/",
    data=json.dumps({
        "identifier": "manestech0@gmail.com",
        "password": "Admin123456789"
    }),
    content_type="application/json"
)

print(f"Status code: {response.status_code}")
res_data = response.json()
print("Response detail:", res_data.get("detail"))
user_info = res_data.get("user", {})
print(f"User: {user_info.get('name')} | Email: {user_info.get('email')} | Active Role: {user_info.get('activeRole')} | Assigned Roles: {user_info.get('assignedRoles')}")

# Also test wrong password:
bad_res = c.post(
    "/api/v1/accounts/login/",
    data=json.dumps({
        "identifier": "manestech0@gmail.com",
        "password": "WrongPassword999!"
    }),
    content_type="application/json"
)
print(f"Wrong password status: {bad_res.status_code}")
print(f"Wrong password message: {bad_res.json().get('detail')}")
