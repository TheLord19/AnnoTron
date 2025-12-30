from db import db
from datetime import datetime

class Annotation(db.Model):
    __tablename__ = "annotations"  # Plural to match your style

    id = db.Column(db.Integer, primary_key=True)
    
    # ✅ FIX: Reference the PLURAL table name "dataset_images"
    dataset_image_id = db.Column(
        db.Integer, 
        db.ForeignKey("dataset_images.id"), 
        nullable=False
    )
    
    # Data Fields
    class_id = db.Column(db.Integer, default=0)
    
    # Coordinates
    x = db.Column(db.Float, nullable=False)
    y = db.Column(db.Float, nullable=False)
    width = db.Column(db.Float, nullable=False)
    height = db.Column(db.Float, nullable=False)
    
    confidence = db.Column(db.Float, default=1.0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)