from datetime import datetime
from ..db import db


# -------------------------
# Project
# -------------------------
class Project(db.Model):
    __tablename__ = "projects"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    datasets = db.relationship(
        "Dataset",
        backref="project",
        cascade="all, delete-orphan",
        lazy=True,
    )


# -------------------------
# Dataset
# -------------------------
class Dataset(db.Model):
    __tablename__ = "datasets"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)

    project_id = db.Column(
        db.Integer,
        db.ForeignKey("projects.id"),
        nullable=False,
    )

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    dataset_images = db.relationship(
        "DatasetImage",
        backref="dataset",
        cascade="all, delete-orphan",
        lazy=True,
    )


# -------------------------
# Image (raw pool, project-level)
# -------------------------
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

    datasets = db.relationship(
        "DatasetImage",
        backref="image",
        cascade="all, delete-orphan",
        lazy=True,
    )


# -------------------------
# Dataset ↔ Image (state layer)
# -------------------------
class DatasetImage(db.Model):
    __tablename__ = "dataset_images"

    id = db.Column(db.Integer, primary_key=True)

    dataset_id = db.Column(
        db.Integer,
        db.ForeignKey("datasets.id"),
        nullable=False,
    )

    image_id = db.Column(
        db.Integer,
        db.ForeignKey("images.id"),
        nullable=False,
    )

    status = db.Column(
        db.String(32),
        default="unannotated",
        nullable=False,
    )  # unannotated | annotated | skipped

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    annotation = db.relationship(
        "Annotation",
        backref="dataset_image",
        uselist=False,
        cascade="all, delete-orphan",
    )


# -------------------------
# Annotation
# -------------------------
class Annotation(db.Model):
    __tablename__ = "annotations"

    id = db.Column(db.Integer, primary_key=True)

    dataset_image_id = db.Column(
        db.Integer,
        db.ForeignKey("dataset_images.id"),
        nullable=False,
        unique=True,
    )

    boxes = db.Column(db.JSON, nullable=False)  # [{x,y,w,h,label}, ...]

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
