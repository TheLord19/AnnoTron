import os
import time
from flask import Blueprint, request, jsonify, current_app, send_from_directory
from werkzeug.utils import secure_filename
from db import db
from models.image import Image
from models.dataset import Dataset
from models.dataset_image import DatasetImage

images_bp = Blueprint('images', __name__)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@images_bp.route('/upload', methods=['POST'])
def upload_image():
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file part"}), 400
        
        file = request.files['file']
        dataset_id = request.form.get('dataset_id')

        if not file or file.filename == '':
            return jsonify({"error": "No selected file"}), 400
        
        if not dataset_id:
            return jsonify({"error": "Dataset ID missing"}), 400

        # 1. Get Dataset to find the Project ID
        dataset = Dataset.query.get(dataset_id)
        if not dataset:
            return jsonify({"error": "Dataset not found"}), 404

        if file and allowed_file(file.filename):
            # 2. Secure Save
            original_filename = secure_filename(file.filename)
            # Add timestamp to prevent duplicates overwriting each other
            unique_filename = f"{int(time.time())}_{original_filename}"
            
            save_path = os.path.join(current_app.config['UPLOAD_FOLDER'], unique_filename)
            file.save(save_path)

            # 3. Create Image Record (Linked to Project)
            new_image = Image(
                filename=unique_filename,
                project_id=dataset.project_id
            )
            db.session.add(new_image)
            db.session.flush() # Flush to get new_image.id before commit

            # 4. Link Image to Dataset (The "Middleman" Table)
            new_link = DatasetImage(
                dataset_id=dataset.id,
                image_id=new_image.id,
                status='unannotated'
            )
            db.session.add(new_link)
            
            db.session.commit()

            return jsonify({"message": "Uploaded successfully", "filename": unique_filename}), 201

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
            # We access .image because we added that relationship in dataset_image.py
            image_url = f"http://localhost:5000/api/images/file/{link.image.filename}"
            results.append({
                "id": link.image_id,
                "url": image_url,
                "status": link.status
            })
            
        return jsonify(results), 200
    except Exception as e:
        print(f"FETCH ERROR: {e}")
        return jsonify({"error": str(e)}), 500