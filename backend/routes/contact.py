from flask import Blueprint, request, jsonify
from supabase import create_client
from backend.config import SUPABASE_URL, SUPABASE_SECRET_KEY

contact_bp = Blueprint("contact", __name__)
supabase = create_client(SUPABASE_URL, SUPABASE_SECRET_KEY)

LIMITS = {
    "name": 50,
    "phone": 20,
    "email": 50,
    "message": 1000
}

@contact_bp.route("/contact", methods=["POST"])
def contact():
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
