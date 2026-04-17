from flask import Flask, send_from_directory
from backend.config import FLASK_SECRET_KEY
from backend.routes.upload import upload_bp
from backend.routes.contact import contact_bp
import os

app = Flask(
    __name__,
    static_folder="static",
    template_folder="templates"
)

app.secret_key = FLASK_SECRET_KEY

# Register API blueprints
app.register_blueprint(upload_bp, url_prefix="/api")
app.register_blueprint(contact_bp, url_prefix="/api")

# Serve HTML pages
@app.route("/")
def index():
    return send_from_directory("templates", "index.html")

@app.route("/<page>.html")
def serve_page(page):
    return send_from_directory("templates", f"{page}.html")

@app.route("/admin/<page>.html")
def serve_admin_page(page):
    return send_from_directory("templates/admin", f"{page}.html")

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
