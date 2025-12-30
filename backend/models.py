from db import db
from datetime import datetime
import json

class Project(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class Image(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey("project.id"), nullable=False)
    filename = db.Column(db.String(256), nullable=False)
    # Change nullable to True or give it a default
    upload_order = db.Column(db.Integer, nullable=True, default=0)

class Dataset(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey("project.id"), nullable=False)
    name = db.Column(db.String(120), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
class DatasetImage(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    dataset_id = db.Column(db.Integer, db.ForeignKey("dataset.id"), nullable=False)
    image_id = db.Column(db.Integer, db.ForeignKey("image.id"), nullable=False)

    status = db.Column(
        db.String(20),
        default="unannotated"  # unannotated | annotated | skipped
    )


class Annotation(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    dataset_id = db.Column(db.Integer, nullable=False)
    image_id = db.Column(db.Integer, nullable=False)
    status = db.Column(db.String(20), default="draft")
    boxes = db.Column(db.JSON, default=[])

class DatasetImageState(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    dataset_id = db.Column(db.Integer, db.ForeignKey("dataset.id"), nullable=False)
    image_id = db.Column(db.Integer, db.ForeignKey("image.id"), nullable=False)

    annotations = db.Column(db.Text, default="[]")  # JSON
    status = db.Column(db.String(20), default="draft")  # draft | done
    updated_at = db.Column(db.DateTime, default=datetime.utcnow)
