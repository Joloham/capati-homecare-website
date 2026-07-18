from flask import Blueprint, request, jsonify, current_app
from supabase import create_client
from backend.config import SUPABASE_URL, SUPABASE_SECRET_KEY
import time
import re

contact_bp = Blueprint("contact", __name__)
supabase = create_client(SUPABASE_URL, SUPABASE_SECRET_KEY)

LIMITS = {
    "name": 50,
    "phone": 20,
    "email": 254,
    "message": 1000
}

EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

# Simple in-memory rate limiter — 1 submission per IP per 60 seconds
_rate_limit = {}
RATE_LIMIT_SECONDS = 60

def cleanup_rate_limit():
    now = time.time()
    expired = [ip for ip, t in _rate_limit.items() if now - t > RATE_LIMIT_SECONDS]
    for ip in expired:
        del _rate_limit[ip]

def is_rate_limited(ip):
    now = time.time()
    last = _rate_limit.get(ip, 0)
    if now - last < RATE_LIMIT_SECONDS:
        return True
    _rate_limit[ip] = now
    return False

@contact_bp.route("/contact", methods=["POST"])
def contact():
    ip = request.headers.get("X-Forwarded-For", request.remote_addr).split(",")[0].strip()

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"error": "Invalid JSON body"}), 400

    required_fields = ("name", "phone", "email", "message")

    if any(not isinstance(data.get(field), str) for field in required_fields):
        return jsonify({"error": "All fields must be text"}), 400

    name = data["name"].strip()
    phone = data["phone"].strip()
    email = data["email"].strip()
    message = data["message"].strip()

    if not name or not phone or not email or not message:
        return jsonify({"error": "All fields are required"}), 400

    if not EMAIL_PATTERN.fullmatch(email):
        return jsonify({"error": "Please enter a valid email address"}), 400

    if len(name) > LIMITS["name"]:
        return jsonify({"error": f"Name must be {LIMITS['name']} characters or less"}), 400

    if len(phone) > LIMITS["phone"]:
        return jsonify({"error": f"Phone must be {LIMITS['phone']} characters or less"}), 400

    if len(email) > LIMITS["email"]:
        return jsonify({"error": f"Email must be {LIMITS['email']} characters or less"}), 400

    if len(message) > LIMITS["message"]:
        return jsonify({"error": f"Message must be {LIMITS['message']} characters or less"}), 400

    cleanup_rate_limit()
    if is_rate_limited(ip):
        return jsonify({"error": "Too many requests. Please wait before submitting again."}), 429

    try:
        supabase.table("contacts").insert({
            "name": name,
            "phone": phone,
            "email": email,
            "message": message
        }).execute()

        return jsonify({"success": True}), 200

    except Exception:
        current_app.logger.exception("Contact submission failed")
        return jsonify({
            "error": "Unable to process the request right now."
        }), 500
