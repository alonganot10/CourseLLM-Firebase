import os
import firebase_admin
from firebase_admin import auth

# Point Firebase Admin at the emulator
os.environ["FIREBASE_AUTH_EMULATOR_HOST"] = "127.0.0.1:9099"

# Use the same project ID as the emulator
try:
    firebase_admin.get_app()
except ValueError:
    firebase_admin.initialize_app(options={"projectId": "demo-no-project"})

# Paste your TEACHER_UID here:
TEACHER_UID = "XJDNoSmCoxF9yYxO7wpEL0NkzQl2"

auth.set_custom_user_claims(TEACHER_UID, {"role": "teacher"})
print("Custom claims set for teacher:", TEACHER_UID)
