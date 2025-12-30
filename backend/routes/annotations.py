import os
import torch
import gc # Garbage Collector for RAM management
from flask import Blueprint, request, jsonify, current_app
from db import db
from models.dataset_image import DatasetImage
from models.annotation import Annotation
from ultralytics import YOLO

annotations_bp = Blueprint('annotations', __name__)

# --- 1. AI ENGINE STATE ---
current_model = None
current_model_name = None
device = 'cpu'

MODEL_MAP = {
    "v8": "yolov8n.pt",   # Quick (Nano)
    "v9": "yolov9c.pt",   # Balanced (Compact)
    "v11": "yolo11x.pt",  # Precise (X-Large)
    "custom": "best.pt"   # Custom Internship Weights
}

# --- 2. INTELLIGENCE LOADER ---
def load_model_dynamically(target_model_key):
    global current_model, current_model_name, device

    target_filename = MODEL_MAP.get(target_model_key, "yolov8n.pt")
    
    # Path handling for Custom model
    if target_model_key == "custom":
        # Ensure weights folder exists
        weights_dir = os.path.join(os.getcwd(), "weights")
        os.makedirs(weights_dir, exist_ok=True)
        
        target_path = os.path.join(weights_dir, "best.pt")
        if not os.path.exists(target_path):
            raise FileNotFoundError("Custom model not found. Please upload 'best.pt' via the menu.")
    else:
        target_path = target_filename

    if current_model is not None and current_model_name == target_model_key:
        return

    print(f"🔄 Swapping AI Model to: {target_model_key.upper()}...")

    if current_model is not None:
        del current_model
        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
    
    if torch.cuda.is_available():
        device = 'cuda'
        print("🚀 GPU Detected (CUDA)")
    elif torch.backends.mps.is_available():
        device = 'mps'
        print("🍎 Apple Silicon Detected (MPS)")
    else:
        device = 'cpu'
        print("🐢 CPU Mode")

    current_model = YOLO(target_path)
    current_model_name = target_model_key
    print(f"✅ Model Loaded: {target_path}")


# --- 3. AUTO-ANNOTATION ROUTE ---
@annotations_bp.route('/auto', methods=['POST'])
def auto_annotate():
    global current_model
    try:
        data = request.json
        image_id = data.get('image_id')
        dataset_id = data.get('dataset_id')
        requested_model = data.get('model', 'v8') 

        try:
            load_model_dynamically(requested_model)
        except FileNotFoundError as e:
             return jsonify({"error": str(e)}), 404
        except Exception as e:
             print(f"Model Load Failed: {e}")
             return jsonify({"error": f"Failed to load {requested_model}: {str(e)}"}), 500

        dataset_image = DatasetImage.query.filter_by(dataset_id=dataset_id, image_id=image_id).first()
        if not dataset_image: return jsonify({"error": "Image not found"}), 404

        image_path = os.path.join(current_app.config['UPLOAD_FOLDER'], dataset_image.image.filename)
        if not os.path.exists(image_path): return jsonify({"error": "File missing"}), 404

        conf_threshold = 0.25 if requested_model in ['v8', 'v9'] else 0.15
        results = current_model(image_path, device=device, conf=conf_threshold) 
        
        auto_boxes = []
        for r in results:
            for box in r.boxes:
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                cls = int(box.cls[0])
                auto_boxes.append({
                    "x": x1, "y": y1, "w": x2 - x1, "h": y2 - y1, "class_id": cls
                })

        return jsonify({"boxes": auto_boxes, "model": current_model_name, "device": device}), 200

    except Exception as e:
        print(f"Auto-Annotate Error: {e}")
        return jsonify({"error": str(e)}), 500

# --- 4. UPLOAD CUSTOM MODEL ROUTE (✅ NEW) ---
@annotations_bp.route('/upload-model', methods=['POST'])
def upload_custom_model():
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file uploaded"}), 400
            
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400

        # Ensure filename ends with .pt
        if not file.filename.endswith('.pt'):
             return jsonify({"error": "Invalid file. Please upload a YOLO .pt file"}), 400

        # Create weights directory
        weights_dir = os.path.join(os.getcwd(), "weights")
        os.makedirs(weights_dir, exist_ok=True)
        
        # Force filename to 'best.pt' so the logic always finds it
        save_path = os.path.join(weights_dir, "best.pt")
        file.save(save_path)
        
        # Force reload next time 'custom' is requested
        global current_model, current_model_name
        if current_model_name == 'custom':
            current_model = None 
            current_model_name = None
            
        return jsonify({"message": "Custom model uploaded successfully! Select 'Custom' to use it."}), 200

    except Exception as e:
        print(f"Model Upload Error: {e}")
        return jsonify({"error": str(e)}), 500

# --- 5. STANDARD ROUTES (Save/Get) ---
@annotations_bp.route('/save', methods=['POST'])
def save_annotations():
    try:
        data = request.json
        dataset_id = int(data.get('dataset_id'))
        image_id = int(data.get('image_id'))
        boxes = data.get('boxes', [])
        
        dataset_image = DatasetImage.query.filter_by(dataset_id=dataset_id, image_id=image_id).first()
        if not dataset_image: return jsonify({"error": "Link not found"}), 404
        
        Annotation.query.filter_by(dataset_image_id=dataset_image.id).delete()
        for box in boxes:
            new_annotation = Annotation(
                dataset_image_id=dataset_image.id,
                class_id=box.get('class_id', 0),
                x=box.get('x'), y=box.get('y'), width=box.get('w'), height=box.get('h')
            )
            db.session.add(new_annotation)
            
        dataset_image.status = 'annotated' if len(boxes) > 0 else 'skipped'
        db.session.commit()
        return jsonify({"message": "Saved"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@annotations_bp.route('/get/<int:dataset_id>/<int:image_id>', methods=['GET'])
def get_annotations(dataset_id, image_id):
    try:
        dataset_image = DatasetImage.query.filter_by(dataset_id=dataset_id, image_id=image_id).first()
        if not dataset_image: return jsonify({"boxes": []}), 200
        annotations = Annotation.query.filter_by(dataset_image_id=dataset_image.id).all()
        boxes = [{"x": a.x, "y": a.y, "w": a.width, "h": a.height, "class_id": a.class_id} for a in annotations]
        return jsonify({"boxes": boxes}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500