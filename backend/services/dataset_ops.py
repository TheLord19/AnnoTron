from sqlalchemy import func
from db import db
from models import DatasetImage


def get_dataset_stats(dataset_id: int):
    total = db.session.query(func.count(DatasetImage.id)) \
        .filter(DatasetImage.dataset_id == dataset_id) \
        .scalar() or 0

    annotated = db.session.query(func.count(DatasetImage.id)) \
        .filter(
            DatasetImage.dataset_id == dataset_id,
            DatasetImage.status == "annotated"
        ).scalar() or 0

    skipped = db.session.query(func.count(DatasetImage.id)) \
        .filter(
            DatasetImage.dataset_id == dataset_id,
            DatasetImage.status == "skipped"
        ).scalar() or 0

    return {
        "total": total,
        "annotated": annotated,
        "skipped": skipped,
        "unannotated": total - annotated - skipped,
    }
