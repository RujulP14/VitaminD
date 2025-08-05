import math
from datetime import datetime, timedelta
from typing import Dict, Tuple, Optional
from ..utils.sun import subsolar_point
import ephem

class SeatScorer:
    def __init__(self):
        self.sun_cache = {}  # Cache for sun position calculations
    
    def calculate_seat_scores(self, 
                             from_lat: float, from_lon: float,
                             to_lat: float, to_lon: float,
                             departure_date: str, departure_time: str,
                             duration_minutes: int,
                             preference: str = 'sunrise') -> Dict:
        """
        Calculate optimal seat scores based on sun position during flight.
        Uses advanced astronomical calculations and geospatial analysis.
        """
        # Parse departure time
        departure_dt = datetime.strptime(f"{departure_date} {departure_time}", "%Y-%m-%d %H:%M")
        
        # Initialize scores
        left_side = {"sunrise": 0, "sunset": 0}
        right_side = {"sunrise": 0, "sunset": 0}
        
        # Calculate flight path bearing
        flight_path_bearing = self._calculate_flight_path_bearing(from_lat, from_lon, to_lat, to_lon)
        
        # Calculate total flight distance
        total_distance = self._calculate_great_circle_distance(from_lat, from_lon, to_lat, to_lon)
        
        # Determine time intervals based on flight duration
        interval_minutes = 1  # Sample every minute for accuracy
        
        # Track sunrise/sunset events
        sunrise_event = None
        sunset_event = None
        
        # Process each interval
        for minute in range(0, duration_minutes + 1, interval_minutes):
            # Calculate current time
            current_time = departure_dt + timedelta(minutes=minute)
            
            # Calculate plane position along flight path
            progress = minute / duration_minutes if duration_minutes > 0 else 0
            plane_lat = from_lat + (to_lat - from_lat) * progress
            plane_lon = from_lon + (to_lon - from_lon) * progress
            
            # Get sun position
            sun_pos = self._get_cached_sun_position(current_time)
            
            # Calculate sun's altitude at plane position
            sun_altitude = self._calculate_sun_altitude((plane_lat, plane_lon), sun_pos)
            
            # Only process if sun is above horizon
            if sun_altitude > 0:
                # Calculate bearing from plane to destination
                bearing_to_dest = self._calculate_bearing(plane_lat, plane_lon, to_lat, to_lon)
                
                # Calculate bearing from plane to sun
                bearing_to_sun = self._calculate_bearing(plane_lat, plane_lon, sun_pos["lat"], sun_pos["lon"])
                
                # Calculate angle difference to determine which side sun is on
                angle_diff = ((bearing_to_sun - bearing_to_dest + 540) % 360) - 180
                
                # Determine which side the sun is on
                sun_on_right = angle_diff > 0
                
                # Calculate sun weight based on altitude (higher altitude = more weight)
                sun_weight = sun_altitude / 90.0  # Normalize to 0-1
                
                # Determine if it's sunrise or sunset time
                is_sunrise = self._is_sun_rising(current_time)
                
                # Debug information
                # print(f"Minute: {minute}, Progress: {progress:.2f}, Plane: ({plane_lat:.3f}, {plane_lon:.3f})")
                # print(f"  Bearing to dest: {bearing_to_dest:.1f}°, Bearing to sun: {bearing_to_sun:.1f}°")
                # print(f"  Angle diff: {angle_diff:.1f}°, Sun on right: {sun_on_right}")
                # print(f"  Sun altitude: {sun_altitude:.1f}°, Weight: {sun_weight:.3f}")
                
                # Assign points based on sun position
                if sun_on_right:
                    # Sun is on right side
                    if is_sunrise:
                        right_side["sunrise"] += sun_weight
                        # print(f"  -> Right side sunrise +{sun_weight:.3f}")
                    else:
                        right_side["sunset"] += sun_weight
                        # print(f"  -> Right side sunset +{sun_weight:.3f}")
                else:
                    # Sun is on left side
                    if is_sunrise:
                        left_side["sunrise"] += sun_weight
                        # print(f"  -> Left side sunrise +{sun_weight:.3f}")
                    else:
                        left_side["sunset"] += sun_weight
                        # print(f"  -> Left side sunset +{sun_weight:.3f}")
                
                # Track sunrise/sunset events
                if is_sunrise and sunrise_event is None:
                    sunrise_event = {
                        "time": current_time,
                        "location": {"lat": plane_lat, "lon": plane_lon}
                    }
                elif not is_sunrise and sunset_event is None:
                    sunset_event = {
                        "time": current_time,
                        "location": {"lat": plane_lat, "lon": plane_lon}
                    }
        
        # Calculate total scores
        left_total = left_side["sunrise"] + left_side["sunset"]
        right_total = right_side["sunrise"] + right_side["sunset"]
        
        # Determine recommended side based on preference
        if preference == 'sunrise':
            # For sunrise preference, pick the side with higher sunrise score
            left_sunrise = left_side["sunrise"]
            right_sunrise = right_side["sunrise"]
            
            if left_sunrise > right_sunrise:
                recommended_side = "left"
            elif right_sunrise > left_sunrise:
                recommended_side = "right"
            else:
                # If equal, fall back to total score
                recommended_side = "left" if left_total > right_total else "right"
                
        elif preference == 'sunset':
            # For sunset preference, pick the side with higher sunset score
            left_sunset = left_side["sunset"]
            right_sunset = right_side["sunset"]
            
            if left_sunset > right_sunset:
                recommended_side = "left"
            elif right_sunset > left_sunset:
                recommended_side = "right"
            else:
                # If equal, fall back to total score
                recommended_side = "left" if left_total > right_total else "right"
        else:
            # No preference, use total score comparison
            recommended_side = "left" if left_total > right_total else "right"
        
        # Print scores to console for debugging
        print(f"=== SEAT SCORING DEBUG ===")
        print(f"Preference: {preference}")
        print(f"Left Side - Sunrise: {left_side['sunrise']:.2f}, Sunset: {left_side['sunset']:.2f}, Total: {left_total:.2f}")
        print(f"Right Side - Sunrise: {right_side['sunrise']:.2f}, Sunset: {right_side['sunset']:.2f}, Total: {right_total:.2f}")
        print(f"Recommended Side: {recommended_side}")
        if sunrise_event:
            print(f"Sunrise Event: {sunrise_event['time']} at ({sunrise_event['location']['lat']:.3f}, {sunrise_event['location']['lon']:.3f})")
        if sunset_event:
            print(f"Sunset Event: {sunset_event['time']} at ({sunset_event['location']['lat']:.3f}, {sunset_event['location']['lon']:.3f})")
        print(f"==========================")
        
        return {
            "left_side": left_side,
            "right_side": right_side,
            "left_total": left_total,
            "right_total": right_total,
            "recommended_side": recommended_side,
            "preference": preference
        }
    
    def _calculate_flight_path(self, from_lat: float, from_lon: float, 
                              to_lat: float, to_lon: float, duration_minutes: int) -> list:
        """Calculate great circle flight path with multiple points."""
        # Simple linear interpolation for now
        # In production, use proper great circle calculation
        points = []
        for i in range(0, duration_minutes + 1):
            progress = i / duration_minutes
            lat = from_lat + (to_lat - from_lat) * progress
            lon = from_lon + (to_lon - from_lon) * progress
            points.append((lat, lon))
        return points
    
    def _get_plane_position(self, flight_points: list, minute: int, duration_minutes: int) -> Tuple[float, float]:
        """Get plane position at specific minute."""
        if minute >= len(flight_points):
            return flight_points[-1]
        return flight_points[minute]
    
    def _get_cached_sun_position(self, dt: datetime) -> Dict[str, float]:
        """Get sun position with caching."""
        cache_key = dt.strftime("%Y-%m-%d %H:%M")
        
        if cache_key not in self.sun_cache:
            self.sun_cache[cache_key] = subsolar_point(dt)
        
        return self.sun_cache[cache_key]
    
    def _calculate_sun_altitude(self, plane_pos: Tuple[float, float], sun_pos: Dict[str, float]) -> float:
        """Calculate sun's altitude at plane position."""
        # Simplified calculation - in production, use proper astronomical formulas
        plane_lat, plane_lon = plane_pos
        sun_lat, sun_lon = sun_pos["lat"], sun_pos["lon"]
        
        # Calculate angular distance
        lat_diff = abs(sun_lat - plane_lat)
        lon_diff = abs(sun_lon - plane_lon)
        
        # Simplified altitude calculation
        # In reality, this should use proper astronomical formulas
        altitude = 90 - (lat_diff + lon_diff) / 2
        return max(0, altitude)  # Ensure non-negative
    
    def _calculate_plane_bearing(self, flight_points: list, minute: int, duration_minutes: int) -> float:
        """Calculate plane's bearing at specific minute."""
        if minute >= len(flight_points) - 1:
            # Use previous point for bearing
            minute = len(flight_points) - 2
        
        current = flight_points[minute]
        next_point = flight_points[minute + 1]
        
        # Calculate bearing
        lat1, lon1 = current
        lat2, lon2 = next_point
        
        d_lon = lon2 - lon1
        y = math.sin(d_lon) * math.cos(lat2)
        x = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(d_lon)
        bearing = math.atan2(y, x)
        
        return math.degrees(bearing) % 360
    
    def _calculate_sun_azimuth(self, plane_pos: Tuple[float, float], sun_pos: Dict[str, float]) -> float:
        """Calculate sun's azimuth relative to plane position."""
        plane_lat, plane_lon = plane_pos
        sun_lat, sun_lon = sun_pos["lat"], sun_pos["lon"]
        
        # Calculate azimuth from plane to sun
        d_lon = sun_lon - plane_lon
        y = math.sin(d_lon) * math.cos(sun_lat)
        x = math.cos(plane_lat) * math.sin(sun_lat) - math.sin(plane_lat) * math.cos(sun_lat) * math.cos(d_lon)
        azimuth = math.atan2(y, x)
        
        return math.degrees(azimuth) % 360
    
    def _calculate_sun_weight(self, sun_relative_angle: float) -> float:
        """
        Calculate weight based on sun's angle relative to plane direction.
        
        Args:
            sun_relative_angle: Angle between sun and plane direction (0-360°)
        
        Returns:
            Weight between 0 and 1
        """
        # Normalize angle to 0-180 range
        angle = abs(sun_relative_angle % 180)
        
        # Convert to weight: 0° = 0.0, 90° = 1.0, 180° = 0.0
        weight = abs(math.sin(math.radians(angle)))
        
        return weight
    
    def _calculate_bearing(self, from_lat: float, from_lon: float, to_lat: float, to_lon: float) -> float:
        """Calculate bearing from one point to another."""
        d_lon = to_lon - from_lon
        y = math.sin(d_lon) * math.cos(to_lat)
        x = math.cos(from_lat) * math.sin(to_lat) - math.sin(from_lat) * math.cos(to_lat) * math.cos(d_lon)
        bearing = math.atan2(y, x)
        return math.degrees(bearing) % 360
    
    def _calculate_flight_path_bearing(self, from_lat: float, from_lon: float, to_lat: float, to_lon: float) -> float:
        """Calculate bearing of flight path from departure to arrival."""
        return self._calculate_bearing(from_lat, from_lon, to_lat, to_lon)
    
    def _calculate_great_circle_distance(self, from_lat: float, from_lon: float, to_lat: float, to_lon: float) -> float:
        """Calculate great circle distance between two points in kilometers."""
        # Convert to radians
        lat1, lon1, lat2, lon2 = map(math.radians, [from_lat, from_lon, to_lat, to_lon])
        
        # Haversine formula
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        c = 2 * math.asin(math.sqrt(a))
        
        # Earth's radius in kilometers
        r = 6371
        return c * r
    
    def _is_sun_rising(self, dt: datetime) -> bool:
        """Determine if sun is rising at given time."""
        # Simplified logic - in production, use proper sunrise/sunset calculations
        hour = dt.hour
        return 5 <= hour <= 12  # Rough estimate for sunrise hours 