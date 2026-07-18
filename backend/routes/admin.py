from flask import Blueprint, request, jsonify, session, current_app
from functools import wraps
import requests as http
import time
from backend.config import SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY

admin_bp = Blueprint("admin", __name__)

# ── LOGIN REQUIRED DECORATOR ──

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get("sb_access_token"):
            from flask import redirect
            return redirect("/admin/login")
        return f(*args, **kwargs)
    return decorated

# ── LOGIN RATE LIMITER ── (same pattern as contact.py — 3 attempts per IP per 60s)

_login_rate_limit = {}
LOGIN_RATE_LIMIT_SECONDS = 60
LOGIN_RATE_LIMIT_ATTEMPTS = 3

def cleanup_login_rate_limit():
    now = time.time()
    expired = [ip for ip, attempts in _login_rate_limit.items()
               if now - attempts[-1] > LOGIN_RATE_LIMIT_SECONDS]
    for ip in expired:
        del _login_rate_limit[ip]

def is_login_rate_limited(ip):
    now = time.time()
    attempts = _login_rate_limit.get(ip, [])
    attempts = [t for t in attempts if now - t < LOGIN_RATE_LIMIT_SECONDS]
    if len(attempts) >= LOGIN_RATE_LIMIT_ATTEMPTS:
        _login_rate_limit[ip] = attempts
        return True
    attempts.append(now)
    _login_rate_limit[ip] = attempts
    return False

# ── LOGIN ──

@admin_bp.route("/api/login", methods=["POST"])
def login():
    cleanup_login_rate_limit()
    ip =request.remote_addr or "unknown"

    if is_login_rate_limited(ip):
        return jsonify({"error": "Too many login attempts. Please wait before trying again."}), 429


    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"error": "Invalid JSON body"}), 400

    email = data.get("email")
    password = data.get("password")

    if not isinstance(email, str) or not isinstance(password, str):
        return jsonify({"error": "Email and password must be text"}), 400

    email = email.strip()


    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    try:
        res = http.post(
            f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
            headers={
                "Content-Type": "application/json",
                "apikey": SUPABASE_PUBLISHABLE_KEY
            },
            json={"email": email, "password": password},
            timeout=10
        )

        data = res.json()

        if res.ok and data.get("access_token"):
            session["sb_access_token"]  = data["access_token"]
            session["sb_refresh_token"] = data.get("refresh_token", "")
            session["sb_user_email"]    = data["user"]["email"]
            session.permanent           = True
            return jsonify({"success": True}), 200
        else:
            return jsonify({"error": data.get("error_description", "Invalid credentials")}), 401

    except Exception:
        current_app.logger.exception("Admin login request failed")
        return jsonify({
            "error": "Unable to log in right now."
        }), 500

# ── REFRESH TOKEN ──

@admin_bp.route("/api/refresh", methods=["POST"])
def refresh():
    refresh_token = session.get("sb_refresh_token")
    if not refresh_token:
        return jsonify({"error": "No refresh token"}), 401

    try:
        res = http.post(
            f"{SUPABASE_URL}/auth/v1/token?grant_type=refresh_token",
            headers={
                "Content-Type": "application/json",
                "apikey": SUPABASE_PUBLISHABLE_KEY
            },
            json={"refresh_token": refresh_token},
            timeout=10
        )

        data = res.json()

        if res.ok and data.get("access_token"):
            session["sb_access_token"]  = data["access_token"]
            session["sb_refresh_token"] = data.get("refresh_token", refresh_token)
            return jsonify({"success": True}), 200
        else:
            session.clear()
            return jsonify({"error": "Session expired, please log in again"}), 401

    except Exception:
        current_app.logger.exception("Admin token refresh failed")
        return jsonify({
            "error": "Unable to refresh the session right now."
        }), 500

# ── LOGOUT ──

@admin_bp.route("/api/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"success": True}), 200

# ── ME ──

@admin_bp.route("/api/me")
def me():
    if not session.get("sb_access_token"):
        return jsonify({"error": "Not authenticated"}), 401
    return jsonify({
        "email": session.get("sb_user_email", "Admin"),
        "token": session.get("sb_access_token")
    })
