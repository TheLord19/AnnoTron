import os
from flask import Blueprint, request, jsonify, current_app
from db import db
from models.dataset_image import DatasetImage
from models.annotation import Annotation
from services.ai_engine import AIEngine

annotations_bp = Blueprint('annotations', __name__)

# Simple aliases for the model picker; anything not listed is passed straight
# through to AIEngine.load_model as a YOLO weights path/name.
MODEL_MAP = {
    "v8": "yolov8n.pt",
    "v9": "yolov9c.pt",
    "v11": "yolo11x.pt",
}


# --- AUTO-ANNOTATION ROUTE ---
@annotations_bp.route('/auto', methods=['POST'])
def auto_annotate():
    engine = AIEngine.get_instance()
    try:
        data = request.json
        image_id = data.get('image_id')
        dataset_id = data.get('dataset_id')
        requested_model = data.get('model', 'yolo11n.pt')

        warning = None
        if requested_model == 'custom':
            # Custom weights are loaded separately via /api/ai/load (file upload).
            # Reuse whatever the engine already has loaded rather than guessing a path.
            if engine.model is None:
                return jsonify({"error": "No custom model loaded. Upload a .pt file first."}), 400
        else:
            model_to_load = MODEL_MAP.get(requested_model, requested_model)
            success, msg, warning = engine.load_model(model_to_load)
            if not success:
                return jsonify({"error": f"Failed to load {requested_model}: {msg}"}), 500

        dataset_image = DatasetImage.query.filter_by(dataset_id=dataset_id, image_id=image_id).first()
        if not dataset_image:
            return jsonify({"error": "Image not found"}), 404

        image_path = os.path.join(current_app.config['UPLOAD_FOLDER'], dataset_image.image.filename)
        if not os.path.exists(image_path):
            return jsonify({"error": "File missing"}), 404

        conf_threshold = 0.25
        success, msg, detections = engine.detect(image_path, conf=conf_threshold)

        if not success:
            return jsonify({"error": msg}), 500

        auto_boxes = []
        for det in detections:
            x1, y1, x2, y2 = det['bbox']  # normalized [0,1]
            auto_boxes.append({
                "x": x1, "y": y1, "w": x2 - x1, "h": y2 - y1,
                "class_id": det['class_id'], "confidence": det.get('confidence', 1.0)
            })

        return jsonify({
            "boxes": auto_boxes,
            "model": engine.current_model_name,
            "device": engine.device,
            "warning": warning
        }), 200

    except Exception as e:
        print(f"Auto-Annotate Error: {e}")
        return jsonify({"error": str(e)}), 500


# --- STANDARD ROUTES (Save/Get) ---
@annotations_bp.route('/save', methods=['POST'])
def save_annotations():
    try:
        data = request.json
        dataset_id = int(data.get('dataset_id'))
        image_id = int(data.get('image_id'))
        boxes = data.get('boxes', [])

        dataset_image = DatasetImage.query.filter_by(dataset_id=dataset_id, image_id=image_id).first()
        if not dataset_image:
            return jsonify({"error": "Link not found"}), 404

        Annotation.query.filter_by(dataset_image_id=dataset_image.id).delete()
        for box in boxes:
            new_annotation = Annotation(
                dataset_image_id=dataset_image.id,
                class_id=box.get('class_id', 0),
                x=box.get('x'), y=box.get('y'), width=box.get('w'), height=box.get('h'),
                confidence=box.get('confidence', 1.0),
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
        if not dataset_image:
            return jsonify({"boxes": []}), 200
        annotations = Annotation.query.filter_by(dataset_image_id=dataset_image.id).all()
        boxes = [
            {"x": a.x, "y": a.y, "w": a.width, "h": a.height, "class_id": a.class_id, "confidence": a.confidence}
            for a in annotations
        ]
        return jsonify({"boxes": boxes}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
