from flask import Blueprint, request, jsonify, current_app
from supabase import create_client
from backend.config import SUPABASE_URL, SUPABASE_SECRET_KEY, SUPABASE_PUBLISHABLE_KEY
from werkzeug.utils import secure_filename
from PIL import Image, ImageOps
import time
import io

upload_bp = Blueprint("upload", __name__)
supabase = create_client(SUPABASE_URL, SUPABASE_SECRET_KEY)

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp"}
BUCKET_NAME = "gallery"
WEBP_QUALITY = 80

def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

def verify_token(req):
    auth = req.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return False
    token = auth.split(" ", 1)[1]
    try:
        # Verify token against Supabase
        client = create_client(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
        user = client.auth.get_user(token)
        return user is not None
    except Exception:
        return False

def compress_image(file):
    img = Image.open(file)

    # Reorient based on EXIF data (fixes sideways phone photos)
    img = ImageOps.exif_transpose(img)

    if img.mode in ("RGBA", "P", "LA"):
        img = img.convert("RGB")

    # Resize image to a max of 1600x1600 while maintaining aspect ratio
    img.thumbnail((1600, 1600), Image.Resampling.LANCZOS if hasattr(Image, "Resampling") else Image.LANCZOS)

    buffer = io.BytesIO()
    # Aggressively compress and save as modern WebP
    img.save(buffer, format="WEBP", quality=WEBP_QUALITY, method=6, optimize=True)
    buffer.seek(0)
    return buffer

@upload_bp.route("/upload", methods=["POST"])
def upload():
    if not verify_token(request):
        return jsonify({"error": "Unauthorized"}), 401

    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]

    if file.filename == "":
        return jsonify({"error": "Empty filename"}), 400

    if not allowed_file(file.filename):
        return jsonify({"error": "File type not allowed. Use JPG, PNG or WEBP."}), 400

    try:
        compressed = compress_image(file)
        base_name = secure_filename(
            (file.filename or "image").rsplit(".", 1)[0]
        ) or "image"
        filename = f"{int(time.time() * 1000)}_{base_name}.webp"

        supabase.storage.from_(BUCKET_NAME).upload(
            path=filename,
            file=compressed.read(),
            file_options={
                "content-type": "image/webp",
                "cache-control": "15552000"
            }
        )

        public_url = supabase.storage.from_(BUCKET_NAME).get_public_url(filename)

        supabase.table("gallery").insert({
            "filename": filename,
            "caption": None
        }).execute()

        return jsonify({"url": public_url, "filename": filename}), 200

    except Exception:
        current_app.logger.exception("Gallery image upload failed")
        return jsonify({
            "error": "Unable to upload the image right now."
        }), 500
