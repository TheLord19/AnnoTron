import os
from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
from services.ai_engine import AIEngine

ai_bp = Blueprint('ai', __name__)

ALLOWED_EXTENSIONS = {'pt'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@ai_bp.route('/load', methods=['POST'])
def load_model():
    engine = AIEngine.get_instance()
    
    data = request.form if request.form else request.json
    if not data:
        data = {}

    # 1. Handle Custom Weight Upload
    custom_file = request.files.get('file')
    architecture = data.get('architecture', 'yolo11n.pt')
    use_default = data.get('useDefaultWeights') != 'false' # Default to true

    if not use_default and custom_file and allowed_file(custom_file.filename):
        filename = secure_filename(custom_file.filename)
        save_path = os.path.join(current_app.root_path, 'uploads', 'models')
        os.makedirs(save_path, exist_ok=True)
        
        full_path = os.path.join(save_path, filename)
        custom_file.save(full_path)
        success, msg, warning = engine.load_model(full_path)
    else:
        # 2. Load Standard model
        success, msg, warning = engine.load_model(architecture)

    if success:
        return jsonify({
            "status": "success",
            "message": msg,
            "warning": warning
        }), 200
    else:
        return jsonify({
            "status": "error",
            "message": msg
        }), 500

@ai_bp.route('/detect', methods=['POST'])
def detect():
    engine = AIEngine.get_instance()
    data = request.json
    image_data = data.get('image')

    if not image_data:
        return jsonify({"status": "error", "message": "No image data"}), 400

    try:
        # Decode Base64 if needed
        if image_data.startswith('data:image'):
            header, encoded = image_data.split(",", 1)
            import base64
            import numpy as np
            import cv2
            nparr = np.frombuffer(base64.b64decode(encoded), np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            success, msg, detections = engine.detect(img)
        else:
            # Assume it's a path or URL
            success, msg, detections = engine.detect(image_data)

        if success:
            return jsonify({"status": "success", "detections": detections})
        else:
            return jsonify({"status": "error", "message": msg}), 500
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500