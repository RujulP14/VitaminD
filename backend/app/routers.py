from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select

from .models import Airport
from .db import get_session

router = APIRouter(prefix="/api")

@router.get("/health")
def health():
    return {"status": "ok"}

from .utils.ext_airport import get_or_create_airport
from .utils.sun import subsolar_point
from .utils.seat_scoring import SeatScorer
from datetime import datetime

@router.get("/airports")
def list_airports(q: str = Query(min_length=1), session: Session = Depends(get_session)):
    stmt = select(Airport).where(Airport.iata.ilike(f"%{q.upper()}%"))[:5]
    results = session.exec(stmt).all()
    if not results and len(q) == 3:
        # try fetch external
        ap = get_or_create_airport(q)
        if ap:
            results = [ap]
    return results

@router.get("/airport/{iata}")
def airport_details(iata: str):
    ap = get_or_create_airport(iata.upper())
    if not ap:
        return {"error": "not found"}
    return ap

@router.get("/subsolar")
def subsolar(date: str, time: str):
    """Return sub-solar lat/lon for given date (YYYY-MM-DD) and time (HH:MM, utc)."""
    try:
        dt = datetime.fromisoformat(f"{date}T{time}:00+00:00")
    except ValueError:
        return {"error": "invalid datetime"}
    return subsolar_point(dt)

@router.get("/seat-recommendation")
def seat_recommendation(
    from_iata: str,
    to_iata: str,
    date: str,
    time: str,
    duration: int,
    preference: str = "sunrise"
):
    """Calculate optimal seat recommendation based on sun position during flight."""
    try:
        # Get airport coordinates
        from_airport = get_or_create_airport(from_iata)
        to_airport = get_or_create_airport(to_iata)
        
        if not from_airport or not to_airport:
            return {"error": "Airport not found"}
        
        # Check if origin and destination are the same
        if from_iata.upper() == to_iata.upper():
            return {"error": "Cannot travel to the same airport"}
        
        # Check for negative or zero duration
        if duration <= 0:
            return {"error": "Flight duration must be greater than 0 minutes"}
        
        # Initialize seat scorer
        scorer = SeatScorer()
        
        # Calculate seat scores
        scores = scorer.calculate_seat_scores(
            from_lat=from_airport.lat,
            from_lon=from_airport.lon,
            to_lat=to_airport.lat,
            to_lon=to_airport.lon,
            departure_date=date,
            departure_time=time,
            duration_minutes=duration,
            preference=preference
        )
        
        return {
            "from_airport": from_airport.iata,
            "to_airport": to_airport.iata,
            "departure_date": date,
            "departure_time": time,
            "duration_minutes": duration,
            "preference": preference,
            "scores": scores
        }
        
    except Exception as e:
        return {"error": f"Calculation failed: {str(e)}"}
