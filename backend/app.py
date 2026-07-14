from flask import Flask, send_from_directory, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os

# Import DB
from db import db
import models # Register models

# Import Blueprints
from routes.projects import projects_bp
from routes.datasets import datasets_bp
from routes.images import images_bp
from routes.annotations import annotations_bp
from routes.ai import ai_bp

load_dotenv()

def create_app():
    app = Flask(__name__)
    CORS(app)

    # Configuration
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///annotron.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['UPLOAD_FOLDER'] = os.path.join(os.getcwd(), 'uploads')

    # Ensure upload folder exists
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

    # Initialize DB
    db.init_app(app)

    # Register Blueprints
    app.register_blueprint(projects_bp, url_prefix='/api/projects')
    app.register_blueprint(datasets_bp, url_prefix='/api/datasets')
    app.register_blueprint(images_bp, url_prefix='/api/images')
    app.register_blueprint(annotations_bp, url_prefix='/api/annotations')
    app.register_blueprint(ai_bp, url_prefix='/api/ai')

    # Global Error Handler
    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({"error": "Internal Server Error"}), 500

    # Create Tables
    with app.app_context():
        db.create_all()

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=5003, debug=True)
