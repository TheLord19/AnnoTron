from db import db
from datetime import datetime

class Dataset(db.Model):
    __tablename__ = 'datasets'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Foreign Key to Project
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False)
    
    # ✅ THIS WAS MISSING. It allows us to calculate 'len(dataset.images)'
    # It links the Dataset to the 'DatasetImage' table.
    images = db.relationship('DatasetImage', backref='dataset', lazy=True)