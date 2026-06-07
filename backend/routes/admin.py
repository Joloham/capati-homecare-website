from flask import Blueprint, request, jsonify, session
from functools import wraps
import requests as http
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

# ── LOGIN ──

@admin_bp.route("/api/login", methods=["POST"])
def login():
    data     = request.get_json()
    email    = data.get("email", "").strip()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    try:
        res = http.post(
            f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
            headers={
                "Content-Type": "application/json",
                "apikey": SUPABASE_PUBLISHABLE_KEY
            },
            json={"email": email, "password": password}
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

    except Exception as e:
        return jsonify({"error": str(e)}), 500

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
            json={"refresh_token": refresh_token}
        )

        data = res.json()

        if res.ok and data.get("access_token"):
            session["sb_access_token"]  = data["access_token"]
            session["sb_refresh_token"] = data.get("refresh_token", refresh_token)
            return jsonify({"success": True}), 200
        else:
            session.clear()
            return jsonify({"error": "Session expired, please log in again"}), 401

    except Exception as e:
        return jsonify({"error": str(e)}), 500

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
