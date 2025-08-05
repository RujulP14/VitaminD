import os
import requests
from sqlmodel import Session
from ..models import Airport
from ..db import engine

API_HOST = "https://prod.api.market/api/v1/aedbx/aerodatabox"


def get_or_create_airport(iata: str) -> Airport | None:
    code = iata.upper()
    print(code)
    with Session(engine) as session:
        obj = session.get(Airport, code)
        if obj:
            return obj
    print("no obj found")
    key = os.getenv("AERODATA_API_KEY")
    if not key:
        print("AERODATA_API_KEY not set")
        return None
    url = f"{API_HOST}/airports/iata/{code}"
    print(url)
    resp = requests.get(url, headers={
        "x-api-market-key": key
    }, timeout=5000)
    print("Res",resp.text)
    if not resp.ok:
        print("AeroDataBox error", resp.status_code)
        return None
    
    # Check if response has content
    if not resp.content:
        print(f"AeroDataBox returned empty response for {code}")
        return None
    
    try:
        j = resp.json()
        print(f"API Response for {code}: {j}")
    except Exception as e:
        print(f"Failed to parse JSON response for {code}: {e}")
        print(f"Response content: {resp.text}")
        return None
    
    # Validate that we have the required data
    print(f"Validating coordinates for {code}")
    if not j.get("location", {}).get("lat") or not j.get("location", {}).get("lon"):
        print(f"Missing coordinates for airport {code}")
        print(f"Location data: {j.get('location')}")
        return None
    print(f"Coordinates validated for {code}")
    
    airport = Airport(
        iata=code,
        name=j.get("fullName") or j.get("shortName") or j.get("name", ""),
        city=j.get("municipalityName", ""),
        country=j.get("country", {}).get("name", ""),
        lat=j.get("location", {}).get("lat"),
        lon=j.get("location", {}).get("lon"),
        tz=j.get("timeZone", "")
    )
    
    # Use a single session for the entire operation
    with Session(engine) as session:
        try:
            session.add(airport)
            session.commit()
            session.refresh(airport)  # Refresh to get the committed object
            print(f"Successfully added airport: {airport}")
            return airport
        except Exception as e:
            print(f"Error inserting airport {code}: {e}")
            session.rollback()
            # Try to get existing airport
            existing = session.get(Airport, code)
            if existing:
                print(f"Found existing airport: {existing}")
                return existing
            print(f"Failed to insert or find airport {code}")
            return None
