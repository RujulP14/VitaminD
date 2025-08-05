from sqlmodel import SQLModel, Field

class Airport(SQLModel, table=True):
    iata: str = Field(primary_key=True, max_length=3)
    name: str
    city: str
    country: str
    lat: float
    lon: float
    tz: str
