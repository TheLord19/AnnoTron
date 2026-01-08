from flask import Flask, request, jsonify
from flask_cors import CORS
from ultralytics import YOLO
import torch
import os
import base64
import cv2
import numpy as np

app = Flask(__name__)
CORS(app)

# --- GLOBAL VARIABLES ---
current_model = None

# Mock Database for Projects
PROJECTS = [
    {
        "id": 1,
        "name": "Traffic Analysis",
        "description": "YOLO11 detection for city traffic",
        "thumbnail": "https://images.unsplash.com/photo-1494587351196-bbf560c4832d?w=400",
        "lastModified": "2 days ago",
        "datasets": [
            {"id": 101, "name": "Intersection A", "imageCount": 142, "annotatedCount": 120},
            {"id": 102, "name": "Highway Exit", "imageCount": 85, "annotatedCount": 0}
        ]
    },
    {
        "id": 2,
        "name": "Medical X-Rays",
        "description": "Fracture detection dataset",
        "thumbnail": "https://images.unsplash.com/photo-1530497610245-94d3c16cda28?w=400",
        "lastModified": "5 hours ago",
        "datasets": [
             {"id": 201, "name": "Hand X-Rays", "imageCount": 45, "annotatedCount": 45}
        ]
    }
]

# --- HELPER FUNCTIONS ---
def check_system_capabilities(model_size_char):
    """
    Analyzes hardware (CPU vs GPU VRAM) and returns a warning string.
    """
    warning = None
    if torch.cuda.is_available():
        device_type = 'cuda'
        # Get VRAM in GB
        vram_gb = torch.cuda.get_device_properties(0).total_memory / 1e9
    else:
        device_type = 'cpu'
        vram_gb = 0

    if device_type == 'cpu':
        if model_size_char in ['m', 'l', 'x']:
            warning = "You are running on CPU. Selected model (Medium+) will be very slow."
    elif device_type == 'cuda':
        if model_size_char == 'm' and vram_gb < 4.0:
            warning = f"Weak GPU detected ({vram_gb:.1f}GB). YOLO11m might lag."
        elif model_size_char == 'l' and vram_gb < 6.0:
            warning = f"Insufficient VRAM ({vram_gb:.1f}GB). YOLO11l requires powerful GPU."
        elif model_size_char == 'x' and vram_gb < 10.0:
            warning = f"Insufficient VRAM ({vram_gb:.1f}GB). YOLO11x requires top-tier GPU."
    return warning

def _build_cors_preflight_response():
    response = jsonify({})
    response.headers.add("Access-Control-Allow-Origin", "*")
    response.headers.add("Access-Control-Allow-Headers", "*")
    response.headers.add("Access-Control-Allow-Methods", "*")
    return response

# --- SYSTEM & AI ROUTES ---

@app.route('/load-model', methods=['POST'])
def load_model():
    global current_model
    data = request.json
    model_name = data.get('model_name', 'yolo11n.pt') 
    
    size_char = 'n'
    if '11s' in model_name: size_char = 's'
    elif '11m' in model_name: size_char = 'm'
    elif '11l' in model_name: size_char = 'l'
    elif '11x' in model_name: size_char = 'x'

    warning_msg = check_system_capabilities(size_char)

    try:
        print(f" [System] Loading model: {model_name}...")
        current_model = YOLO(model_name)
        
        # Move model to GPU if available
        device = 'cuda' if torch.cuda.is_available() else 'cpu'
        current_model.to(device)
        
        return jsonify({
            "status": "success", 
            "message": f"Loaded {model_name} on {device}",
            "warning": warning_msg
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/detect', methods=['POST'])
def detect():
    global current_model
    
    if current_model is None:
        return jsonify({"status": "error", "message": "No model loaded. Please load a model first."}), 400

    data = request.json
    image_data = data.get('image') # Base64 string from frontend

    if not image_data:
        return jsonify({"status": "error", "message": "No image data provided"}), 400

    try:
        # 1. Decode Base64 image
        header, encoded = image_data.split(",", 1) if "," in image_data else (None, image_data)
        nparr = np.frombuffer(base64.b64decode(encoded), np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        # 2. Run Inference
        results = current_model(img, conf=0.25)
        
        # 3. Parse Results
        detections = []
        for r in results:
            boxes = r.boxes
            for box in boxes:
                b = box.xyxy[0].tolist() 
                conf = float(box.conf[0])
                cls = int(box.cls[0])
                name = current_model.names[cls]

                detections.append({
                    "bbox": b,
                    "confidence": conf,
                    "class": name,
                    "class_id": cls
                })

        return jsonify({
            "status": "success",
            "detections": detections
        })

    except Exception as e:
        print(f"Detection error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

# --- PROJECT MANAGEMENT ROUTES ---

@app.route('/api/projects', methods=['GET'])
def get_projects():
    return jsonify(PROJECTS)

@app.route('/api/projects/create', methods=['POST', 'OPTIONS'])
def create_project():
    if request.method == 'OPTIONS':
        return _build_cors_preflight_response()
    
    data = request.json
    new_name = data.get("name", "Untitled Project")
    
    new_project = {
        "id": len(PROJECTS) + 1,
        "name": new_name,
        "description": "New YOLO11 annotation project",
        "thumbnail": "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=400",
        "lastModified": "Just now",
        "datasets": []
    }
    PROJECTS.append(new_project)
    print(f" [DB] Created Project: {new_name}")
    return jsonify(new_project)

# --- DATASET & ANNOTATION ROUTES ---

@app.route('/api/images/dataset/<int:dataset_id>', methods=['GET'])
def get_dataset_images(dataset_id):
    # DEMO DATA
    demo_images = [
        {"id": 1, "url": "https://images.unsplash.com/photo-1542281286-9e0a16bb7366"},
        {"id": 2, "url": "https://images.unsplash.com/photo-1568605114967-8130f3a36994"},
        {"id": 3, "url": "https://images.unsplash.com/photo-1502877338535-766e1452684a"}
    ]
    return jsonify(demo_images)

@app.route('/api/annotations/get/<int:dataset_id>/<int:image_id>', methods=['GET'])
def get_annotations(dataset_id, image_id):
    # Return empty list or fetch from DB
    return jsonify({"boxes": []})

@app.route('/api/annotations/save', methods=['POST'])
def save_annotations():
    data = request.json
    print(f" [DB] Saving {len(data['boxes'])} boxes for Image {data['image_id']}")
    return jsonify({"status": "success"})

# --- MAIN ---
if __name__ == '__main__':
    app.run(debug=True, port=5000, threaded=True)