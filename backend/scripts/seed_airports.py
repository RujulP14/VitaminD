"""
Load airports.csv (OpenFlights format) into SQLite.
Usage:
    python backend/scripts/seed_airports.py
"""

import csv, pathlib
from sqlmodel import Session

import importlib, sys
ROOT = pathlib.Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.append(str(ROOT))

engine = importlib.import_module("backend.app.db").engine
Airport = importlib.import_module("backend.app.models").Airport

CSV_PATH = pathlib.Path(__file__).parent.parent / "data" / "airports.csv"


def main():
    if not CSV_PATH.exists():
        print("airports.csv not found in data/")
        return

    with Session(engine) as session, open(CSV_PATH, newline="", encoding="utf-8") as f:
        reader = csv.reader(f)
        for row in reader:
            # OpenFlights: ID,Name,City,Country,IATA,ICAO,Lat,Lon,Alt,TZ,DST,TzDB
            iata = row[4]
            if iata and iata != "\\N":
                session.add(
                    Airport(
                        iata=iata.upper(),
                        name=row[1],
                        city=row[2],
                        country=row[3],
                        lat=float(row[6]),
                        lon=float(row[7]),
                        tz=row[11],
                    )
                )
        session.commit()
    print("Seed complete.")


if __name__ == "__main__":
    main()
