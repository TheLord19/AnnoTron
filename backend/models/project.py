from db import db
from datetime import datetime

class Project(db.Model):
    __tablename__ = 'projects'  # <--- CRITICAL FIX: Forces table name to match Foreign Keys
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Optional: Relationship to access datasets easily
    datasets = db.relationship('Dataset', backref='project', lazy=True)
   
