from pydantic import BaseModel

class ConsultationCreate(BaseModel):
    full_name: str
    email: str
    phone: str
    message: str

class ConsultationResponse(BaseModel):
    id: int
    full_name: str
    email: str
    phone: str
    message: str

    class Config:
        from_attributes = True