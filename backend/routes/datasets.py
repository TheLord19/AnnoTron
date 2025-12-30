# from flask import Blueprint, request, jsonify
# from models import Dataset, Image, DatasetImage
# from db import db

# datasets_bp = Blueprint("datasets", __name__)
# @datasets_bp.route("/<int:project_id>", methods=["GET"])
# def list_datasets(project_id):
#     datasets = Dataset.query.filter_by(project_id=project_id).all()

#     return jsonify([
#         {
#             "id": d.id,
#             "name": d.name,
#         }
#         for d in datasets
#     ])

# @datasets_bp.route("/", methods=["POST"])
# def create_dataset():
#     data = request.get_json()
#     if not data:
#         return jsonify({"error": "No data"}), 400

#     # Match lowercase project_id from frontend
#     pid = data.get("project_id")
#     name = data.get("name")

#     if not pid or not name:
#         return jsonify({"error": "Missing project_id or name"}), 400

#     try:
#         dataset = Dataset(name=name, project_id=int(pid))
#         db.session.add(dataset)
#         db.session.flush() # Get the dataset ID

#         # Link existing project images to this new dataset
#         project_images = Image.query.filter_by(project_id=pid).all()
#         for img in project_images:
#             link = DatasetImage(
#                 dataset_id=dataset.id,
#                 image_id=img.id,
#                 status="unannotated"
#             )
#             db.session.add(link)

#         db.session.commit()
#         return jsonify({"id": dataset.id, "name": dataset.name}), 201
#     except Exception as e:
#         db.session.rollback()
#         return jsonify({"error": str(e)}), 500




from flask import Blueprint, request, jsonify
from db import db
from models.dataset import Dataset
from models.project import Project

datasets_bp = Blueprint('datasets', __name__)

@datasets_bp.route('/create', methods=['POST'])
def create_dataset():
    try:
        data = request.json
        project_id = data.get('project_id')
        name = data.get('name')

        if not project_id or not name:
            return jsonify({"error": "Project ID and Name are required"}), 400

        # 1. Verify Project Exists First
        project = Project.query.get(project_id)
        if not project:
            return jsonify({"error": f"Project ID {project_id} does not exist"}), 404

        # 2. Create Dataset
        new_dataset = Dataset(name=name, project_id=project_id)
        db.session.add(new_dataset)
        db.session.commit()

        return jsonify({"message": "Dataset created", "id": new_dataset.id}), 201

    except Exception as e:
        db.session.rollback()
        print(f"Dataset Create Error: {e}") # Check terminal for this
        return jsonify({"error": str(e)}), 500

@datasets_bp.route('/project/<int:project_id>', methods=['GET'])
def get_project_datasets(project_id):
    try:
        datasets = Dataset.query.filter_by(project_id=project_id).all()
        return jsonify([{
            'id': d.id,
            'name': d.name,
            'image_count': len(d.images),
            'annotated_count': 0, # You can implement logic to count annotations later
            'created_at': d.created_at.isoformat()
        } for d in datasets]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500