# backend/app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
from ultralytics import YOLO
import torch
import os

app = Flask(__name__)
CORS(app)

# Global variable to hold the loaded model
current_model = None

def check_system_capabilities(model_size_char):
    """
    Analyzes hardware (CPU vs GPU VRAM) and returns a warning string
    if the selected model is likely to perform poorly.
    model_size_char: 'n', 's', 'm', 'l', 'x'
    """
    warning = None
    
    # 1. Detect Hardware
    if torch.cuda.is_available():
        device_type = 'cuda'
        # Get VRAM in GB (approximate)
        vram_gb = torch.cuda.get_device_properties(0).total_memory / 1e9
        gpu_name = torch.cuda.get_device_name(0)
        print(f" [System] Detected GPU: {gpu_name} with {vram_gb:.2f} GB VRAM")
    else:
        device_type = 'cpu'
        print(" [System] No GPU detected. Running on CPU.")

    # 2. Define Safety Thresholds (Conservative estimates for smooth UI)
    # Keys: Model Size Char -> Required VRAM (GB) or specific flags
    # 'n' (Nano) and 's' (Small) are generally safe on modern CPUs
    
    if device_type == 'cpu':
        # If on CPU, warn against anything heavier than Small
        if model_size_char in ['m', 'l', 'x']:
            warning = "You are running on CPU. Selected model (Medium+) will be very slow."
            
    elif device_type == 'cuda':
        # VRAM Thresholds for smooth real-time annotation
        # m -> wants ~4GB+, l -> wants ~8GB+, x -> wants ~10GB+
        if model_size_char == 'm' and vram_gb < 4.0:
            warning = f"Weak GPU detected ({vram_gb:.1f}GB). YOLO11m might lag."
        elif model_size_char == 'l' and vram_gb < 6.0:
            warning = f"Insufficient VRAM ({vram_gb:.1f}GB). YOLO11l requires powerful GPU."
        elif model_size_char == 'x' and vram_gb < 10.0:
            warning = f"Insufficient VRAM ({vram_gb:.1f}GB). YOLO11x requires top-tier GPU."

    return warning

@app.route('/load-model', methods=['POST'])
def load_model():
    global current_model
    data = request.json
    
    # Default to nano if nothing sent
    model_name = data.get('model_name', 'yolo11n.pt') 
    
    # 1. Parse model size (n, s, m, l, x)
    # Assumes format "yolo11[size].pt"
    size_char = 'n'
    if '11s' in model_name: size_char = 's'
    elif '11m' in model_name: size_char = 'm'
    elif '11l' in model_name: size_char = 'l'
    elif '11x' in model_name: size_char = 'x'

    # 2. Run Hardware Check
    warning_msg = check_system_capabilities(size_char)

    try:
        # 3. Load Model
        # We perform the load even if there is a warning (Soft Warning)
        print(f" [System] Loading model: {model_name}...")
        current_model = YOLO(model_name)
        
        return jsonify({
            "status": "success", 
            "message": f"Loaded {model_name}",
            "warning": warning_msg  # Frontend will display this if not null
        })
        
    except Exception as e:
        print(f"Error loading model: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/detect', methods=['POST'])
def detect():
    # ... your existing detection logic ...
    pass

if __name__ == '__main__':
    app.run(debug=True, port=5000)