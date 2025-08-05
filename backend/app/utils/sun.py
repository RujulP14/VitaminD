import ephem
from datetime import datetime, timezone


def subsolar_point(utc_dt: datetime) -> dict:
    """Return lat/lon of sub-solar point at given UTC datetime."""
    if utc_dt.tzinfo is None:
        utc_dt = utc_dt.replace(tzinfo=timezone.utc)
    utc = ephem.Date(utc_dt)
    sun = ephem.Sun(utc)
    # latitude is declination directly
    lat_deg = float(sun.dec) * 180.0 / ephem.pi
    # longitude = GHA (-RA - GST) converted to east-positive
    observer = ephem.Observer(); observer.date = utc
    gst = observer.sidereal_time()  # radians
    lon_deg = (float(sun.ra) - gst) * 180.0 / ephem.pi
    # wrap to -180..180 then convert to -180..180 east-positive
    lon_deg = (lon_deg + 540) % 360 - 180
    return {"lat": lat_deg, "lon": lon_deg}
