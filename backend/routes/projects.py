from flask import Blueprint, request, jsonify
from db import db
from models.project import Project

projects_bp = Blueprint('projects', __name__)

@projects_bp.route('/', methods=['GET'])
def get_projects():
    try:
        projects = Project.query.order_by(Project.created_at.desc()).all()
        return jsonify([{
            'id': p.id,
            'name': p.name,
            'description': p.description,
            'created_at': p.created_at.isoformat()
        } for p in projects]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@projects_bp.route('/create', methods=['POST'])
def create_project():
    try:
        data = request.json
        print(f"📝 Received Create Request: {data}") # Debug Print

        if not data or 'name' not in data:
            return jsonify({"error": "Name is required"}), 400
            
        new_project = Project(
            name=data['name'],
            description=data.get('description', '')
        )
        db.session.add(new_project)
        db.session.commit()
        
        print(f"✅ Project Created: {new_project.id}") # Debug Print
        
        return jsonify({
            'message': 'Project created',
            'project': {
                'id': new_project.id,
                'name': new_project.name
            }
        }), 201
    except Exception as e:
        db.session.rollback()
        print(f"🔥 CRITICAL ERROR: {str(e)}") # <--- THIS WILL SHOW IN TERMINAL
        import traceback
        traceback.print_exc() # <--- THIS PRINTS THE FULL ERROR STACK
        return jsonify({"error": str(e)}), 500
    
# ✅ THIS WAS LIKELY MISSING OR BROKEN causing the 404
@projects_bp.route('/<int:project_id>', methods=['GET'])
def get_project(project_id):
    try:
        project = Project.query.get(project_id)
        if not project:
            return jsonify({"error": "Project not found"}), 404
            
        return jsonify({
            'id': project.id,
            'name': project.name,
            'description': project.description,
            'created_at': project.created_at.isoformat()
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500