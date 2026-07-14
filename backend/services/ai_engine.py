import os
import torch
from ultralytics import YOLO

# Minimum recommended free VRAM (GB) per model size. Below this the model
# still loads, but the caller gets a non-blocking warning to surface to the user.
VRAM_THRESHOLDS_GB = {
    "m": 4,
    "l": 6,
    "x": 10,
}


def _size_letter(model_name):
    base = os.path.basename(model_name)
    name = base.rsplit(".", 1)[0]
    return name[-1] if name and name[-1].isalpha() else None


class AIEngine:
    _instance = None

    def __init__(self):
        self.model = None
        self.current_model_name = None
        self.device = "cuda" if torch.cuda.is_available() else "cpu"

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def _check_vram(self, model_name):
        if self.device != "cuda":
            return None
        threshold_gb = VRAM_THRESHOLDS_GB.get(_size_letter(model_name))
        if not threshold_gb:
            return None
        try:
            free_bytes, _ = torch.cuda.mem_get_info()
            free_gb = free_bytes / (1024 ** 3)
        except Exception:
            return None
        if free_gb < threshold_gb:
            return (
                f"Low VRAM: {os.path.basename(model_name)} recommends "
                f">{threshold_gb}GB free, only {free_gb:.1f}GB available. "
                "Inference may be slow or fail."
            )
        return None

    def load_model(self, model_path):
        try:
            if self.current_model_name == model_path and self.model is not None:
                return True, f"{model_path} already loaded", self._check_vram(model_path)

            warning = self._check_vram(model_path)
            model = YOLO(model_path)
            model.to(self.device)

            self.model = model
            self.current_model_name = model_path
            return True, f"Loaded {model_path} on {self.device}", warning
        except Exception as e:
            return False, str(e), None

    def detect(self, image, conf=0.25):
        if self.model is None:
            return False, "No model loaded", []
        try:
            results = self.model.predict(source=image, conf=conf, device=self.device, verbose=False)
            result = results[0]
            img_h, img_w = result.orig_shape

            detections = []
            for box in result.boxes:
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                detections.append({
                    # Normalized [0,1] relative to the original image so callers
                    # never need to know pixel dimensions.
                    "bbox": [x1 / img_w, y1 / img_h, x2 / img_w, y2 / img_h],
                    "class_id": int(box.cls[0]),
                    "confidence": float(box.conf[0]),
                })
            return True, "OK", detections
        except Exception as e:
            return False, str(e), []
