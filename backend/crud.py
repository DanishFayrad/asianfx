from sqlalchemy.orm import Session
import models, schemas

def create_consultation(db: Session, consultation: schemas.ConsultationCreate):
    db_consultation = models.Consultation(**consultation.dict())
    db.add(db_consultation)
    db.commit()
    db.refresh(db_consultation)
    return db_consultation