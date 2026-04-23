from flask import Blueprint, request, jsonify
from supabase import create_client
from backend.config import SUPABASE_URL, SUPABASE_SECRET_KEY

upload_bp = Blueprint("upload", __name__)
supabase = create_client(SUPABASE_URL, SUPABASE_SECRET_KEY)

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp"}
BUCKET_NAME = "gallery"

def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

@upload_bp.route("/upload", methods=["POST"])
def upload():
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]

    if file.filename == "":
        return jsonify({"error": "Empty filename"}), 400

    if not allowed_file(file.filename):
        return jsonify({"error": "File type not allowed. Use JPG, PNG or WEBP."}), 400

    try:
        import time
        filename = f"{int(time.time() * 1000)}_{file.filename}"
        file_bytes = file.read()
        content_type = file.content_type or "image/jpeg"

        supabase.storage.from_(BUCKET_NAME).upload(
            path=filename,
            file=file_bytes,
            file_options={"content-type": content_type}
        )

        public_url = supabase.storage.from_(BUCKET_NAME).get_public_url(filename)
        return jsonify({"url": public_url, "filename": filename}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
