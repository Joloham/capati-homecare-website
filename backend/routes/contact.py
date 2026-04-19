from flask import Blueprint, request, jsonify
from supabase import create_client
from backend.config import SUPABASE_URL, SUPABASE_SECRET_KEY

contact_bp = Blueprint("contact", __name__)
supabase = create_client(SUPABASE_URL, SUPABASE_SECRET_KEY)

@contact_bp.route("/contact", methods=["POST"])
def contact():
    data = request.get_json()

    name = data.get("name", "").strip()
    phone = data.get("phone", "").strip()
    email = data.get("email", "").strip()
    message = data.get("message", "").strip()

    if not name or not email or not message:
        return jsonify({"error": "All fields are required"}), 400

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
