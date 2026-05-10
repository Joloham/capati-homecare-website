from flask import Flask, send_from_directory, render_template, jsonify
from backend.config import FLASK_SECRET_KEY, SUPABASE_URL, SUPABASE_SECRET_KEY
from backend.routes.upload import upload_bp
from backend.routes.contact import contact_bp
from supabase import create_client
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

app = Flask(
    __name__,
    static_folder="static",
    template_folder="templates"
)

app.secret_key = FLASK_SECRET_KEY

# Register API blueprints
app.register_blueprint(upload_bp, url_prefix="/api")
app.register_blueprint(contact_bp, url_prefix="/api")

supabase = create_client(SUPABASE_URL, SUPABASE_SECRET_KEY)

# Keep-alive ping for cron-job.org
@app.route("/ping")
def ping():
    try:
        supabase.table("contacts").select("id").limit(1).execute()
        return jsonify({"status": "awake"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Favicon
@app.route("/favicon.ico")
def favicon():
    return send_from_directory(os.path.join(BASE_DIR, "static", "images"), "favicon.svg", mimetype="image/svg+xml")

# Serve HTML pages
@app.route("/")
def index():
    return render_template("index.html")

@app.route("/<page>")
def serve_page(page):
    return render_template(f"{page}.html")

@app.route("/admin/<page>")
def serve_admin_page(page):
    return render_template(f"admin/{page}.html")

@app.route("/robots.txt")
def robots():
    return send_from_directory(BASE_DIR, "robots.txt")

if __name__ == "__main__":
    app.run(debug=False, host="0.0.0.0", port=5000)
