# AnnoTron

## Hardware-Aware YOLO Annotation Tool

AnnoTron is a web-based computer vision annotation tool powered by the **YOLO11** architecture. It provides real-time object detection and annotation assistance with a **hardware-aware backend** that adapts model loading based on available GPU VRAM and CPU resources.

The system is designed to prevent instability on lower-end hardware while still allowing users to run heavier models with soft performance warnings.

---

## Key Features

- **Hardware-Aware Model Loading**  
  Backend inspects GPU VRAM and CPU resources before loading models and issues non-blocking warnings when resources are insufficient.

- **YOLO11 Integration**  
  Full support for Ultralytics YOLO11 variants:
  - Nano (n)
  - Small (s)
  - Medium (m)
  - Large (l)
  - Extra-Large (x)

- **Adaptive UI**  
  Frontend reacts to backend warnings with non-intrusive alerts.

- **Automated Resource Management**  
  Models are dynamically loaded and weights are automatically downloaded if missing.

---

## Technical Stack

- Frontend Framework: Next.js (React)
- Language: TypeScript
- Styling: Tailwind CSS
- Backend Framework: Flask (Python)
- ML Engine: PyTorch, Ultralytics YOLO
- Hardware Detection: Torch CUDA properties

---

## System Architecture
``` 
Browser (Next.js)
|
| REST API
v
Flask Backend
|
| PyTorch / YOLO11
v
CPU / GPU (CUDA)
```

## Project Structure
```
.
├── frontend/ # Next.js application
├── backend/ # Flask server
├── models/ # YOLO weight cache (auto-generated)
├── app.py # Backend entry point
└── README.md
```

## Installation and Setup

### Prerequisites

- Python 3.9+
- Node.js v18+
- (Optional) NVIDIA GPU with CUDA support

---

### 1. Backend Setup (Python / Flask)

Create and activate a virtual environment:

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

```
 
Install dependencies:
```
pip install flask flask-cors ultralytics torch
```



### 2. Frontend Setup (Next.js)

Navigate to the frontend directory:
```
cd frontend
```

Install dependencies:
```
npm install
```
### 3.Running the Application

Start the backend (default port 5000):
```
python app.py
```

Start the frontend (default port 3000):
```
npm run dev
```

Open in browser:
```
http://localhost:3000
```
### Hardware Logic Configuration

The backend uses heuristic VRAM thresholds defined in app.py:

* **Nano (n) / Small (s):** Safe for CPU and entry-level GPUs
* **Medium (m):** Warning if VRAM < 4 GB
* **Large (l):** Warning if VRAM < 6 GB
* **Extra-Large (x):** Warning if VRAM < 10 GB

Warnings are informational only **and do not block** execution.

### Model Weights

* YOLO .pt files are not included in the repository
* Required weights are automatically downloaded from Ultralytics on first use
* Weights are cached locally for subsequent runs

### Troubleshooting 
#### Backend Import Errors

Ensure the virtual environment is activated before running:
```
python app.py
```
#### Slow First-Time Model Load

Initial model selection downloads weights.
This happens only once per model size.

#### CORS Issues

Ensure flask-cors is installed and enabled to allow requests from:
```
http://localhost:3000
```
### License
```
MIT License
```
