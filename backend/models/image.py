from datetime import datetime
from db import db

class Image(db.Model):
    __tablename__ = "images"

    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(512), nullable=False)

    project_id = db.Column(
        db.Integer,
        db.ForeignKey("projects.id"),
        nullable=False,
    )

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # ❌ DELETED the 'datasets' block to fix the collision.
    # The link is now fully managed inside 'models/dataset_image.py'