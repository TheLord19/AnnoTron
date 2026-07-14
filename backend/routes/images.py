import os
import uuid
from flask import Blueprint, request, jsonify, current_app, send_from_directory
from werkzeug.utils import secure_filename
from db import db
from models.image import Image
from models.dataset import Dataset
from models.dataset_image import DatasetImage
from models.annotation import Annotation

images_bp = Blueprint('images', __name__)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@images_bp.route('/upload', methods=['POST'])
def upload_images():
    try:
        if 'files' not in request.files:
            return jsonify({"error": "No files part"}), 400
        
        files = request.files.getlist('files')
        dataset_id = request.form.get('dataset_id')

        if not files or not dataset_id:
            return jsonify({"error": "Files or Dataset ID missing"}), 400

        # 1. Get Dataset to find the Project ID
        dataset = Dataset.query.get(dataset_id)
        if not dataset:
            return jsonify({"error": "Dataset not found"}), 404

        uploaded_count = 0
        
        for file in files:
            if file and allowed_file(file.filename):
                # 2. Secure Save
                original_filename = secure_filename(file.filename)
                unique_filename = f"{uuid.uuid4().hex}_{original_filename}"
                
                # Check if upload folder is set in config (from app.py)
                upload_folder = current_app.config.get('UPLOAD_FOLDER', 'uploads')
                save_path = os.path.join(upload_folder, unique_filename)
                
                file.save(save_path)

                # 3. Create Image Record (Linked to Project)
                # Note: We must create a new Image instance for EACH file
                new_image = Image(
                    filename=unique_filename,
                    project_id=dataset.project_id
                )
                db.session.add(new_image)
                db.session.flush() # Flush to get new_image.id

                # 4. Link Image to Dataset
                new_link = DatasetImage(
                    dataset_id=dataset.id,
                    image_id=new_image.id,
                    status='unannotated'
                )
                db.session.add(new_link)
                uploaded_count += 1
            
        db.session.commit()

        return jsonify({
            "message": f"Uploaded {uploaded_count} images successfully", 
            "count": uploaded_count
        }), 201

    except Exception as e:
        db.session.rollback()
        print(f"UPLOAD ERROR: {e}")
        return jsonify({"error": str(e)}), 500

# Endpoint to serve images to frontend
@images_bp.route('/file/<filename>')
def uploaded_file(filename):
    return send_from_directory(current_app.config['UPLOAD_FOLDER'], filename)

# Endpoint to list images in a dataset
@images_bp.route('/dataset/<int:dataset_id>', methods=['GET'])
def get_dataset_images(dataset_id):
    try:
        # Query the middleman table
        links = DatasetImage.query.filter_by(dataset_id=dataset_id).all()
        
        results = []
        for link in links:
            host = request.host
            image_url = f"http://{host}/api/images/file/{link.image.filename}"

            confidences = [
                a.confidence for a in
                Annotation.query.filter_by(dataset_image_id=link.id).all()
                if a.confidence is not None
            ]
            avg_confidence = sum(confidences) / len(confidences) if confidences else None

            results.append({
                "id": link.image_id,
                "url": image_url,
                "status": link.status,
                "avg_confidence": avg_confidence
            })

        return jsonify(results), 200
    except Exception as e:
        print(f"FETCH ERROR: {e}")
        return jsonify({"error": str(e)}), 500