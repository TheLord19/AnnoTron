from db import db
from datetime import datetime

class DatasetImage(db.Model):
    __tablename__ = "dataset_images"

    id = db.Column(db.Integer, primary_key=True)

    dataset_id = db.Column(
        db.Integer,
        db.ForeignKey("datasets.id"),
        nullable=False
    )

    image_id = db.Column(
        db.Integer,
        db.ForeignKey("images.id"),
        nullable=False
    )

    status = db.Column(db.String(20), default="unannotated")
    
    # ✅ THIS IS THE MISSING COLUMN causing the crash
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint("dataset_id", "image_id", name="uix_dataset_image"),
    )

    image = db.relationship("Image", backref="dataset_links")