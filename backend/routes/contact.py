from flask import Blueprint, request, jsonify
from supabase import create_client
from backend.config import SUPABASE_URL, SUPABASE_SECRET_KEY
import time

contact_bp = Blueprint("contact", __name__)
supabase = create_client(SUPABASE_URL, SUPABASE_SECRET_KEY)

LIMITS = {
    "name": 50,
    "phone": 20,
    "email": 50,
    "message": 1000
}

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
    cleanup_rate_limit()
    ip = request.headers.get("X-Forwarded-For", request.remote_addr).split(",")[0].strip()

    if is_rate_limited(ip):
        return jsonify({"error": "Too many requests. Please wait before submitting again."}), 429

    data = request.get_json()

    name = data.get("name", "").strip()
    phone = data.get("phone", "").strip()
    email = data.get("email", "").strip()
    message = data.get("message", "").strip()

    if not name or not email or not message:
        return jsonify({"error": "All fields are required"}), 400

    if len(name) > LIMITS["name"]:
        return jsonify({"error": f"Name must be {LIMITS['name']} characters or less"}), 400

    if phone and len(phone) > LIMITS["phone"]:
        return jsonify({"error": f"Phone must be {LIMITS['phone']} characters or less"}), 400

    if len(email) > LIMITS["email"]:
        return jsonify({"error": f"Email must be {LIMITS['email']} characters or less"}), 400

    if len(message) > LIMITS["message"]:
        return jsonify({"error": f"Message must be {LIMITS['message']} characters or less"}), 400

    try:
        supabase.table("contacts").insert({
            "name": name,
            "phone": phone,
            "email": email,
            "message": message
        }).execute()

        return jsonify({"success": True}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
