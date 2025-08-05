import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Typography, Button, Stack, Slider, Box, IconButton, FormControl, Select, MenuItem, Chip, Paper } from '@mui/material';
import { PlayArrow, Pause, SkipPrevious, SkipNext, WbSunny, DarkMode, FlightTakeoff, FlightLand, Map, Public } from '@mui/icons-material';
import { MapContainer, TileLayer, Polyline, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { greatCircle, length as lineLength, along } from '@turf/turf';
import useSWR from 'swr';
import { useTheme } from './ThemeContext';
import Globe from 'react-globe.gl';
import * as THREE from 'three';
import 'leaflet/dist/leaflet.css';

const fetcher = (u) => fetch(u).then((r) => r.json());

// Custom component to handle map zoom
function MapZoomController({ fromAp, toAp }) {
  const map = useMap();
  
  useEffect(() => {
    if (fromAp && toAp && fromAp.lat && toAp.lat) {
      const bounds = [
        [fromAp.lat, fromAp.lon],
        [toAp.lat, toAp.lon]
      ];
      map.fitBounds(bounds, { padding: [5, 5] });
    }
  }, [fromAp, toAp, map]);
  
  return null;
}

export default function Results() {
  const { search } = useLocation();
  const navigate = useNavigate();
  const params = Object.fromEntries(new URLSearchParams(search));
  const durationMin = Number(params.duration || 0);
  const { isDarkMode, toggleTheme } = useTheme();
  
  // Globe ref for camera controls
  const globeRef = useRef();
  
  // View toggle state
  const [isGlobeView, setIsGlobeView] = useState(true);

  /* fetch airport coords */
  const { data: fromAp, error: fromApError } = useSWR(params.from ? `/api/airport/${params.from}` : null, fetcher);
  const { data: toAp, error: toApError }   = useSWR(params.to   ? `/api/airport/${params.to}`   : null, fetcher);
  
  // Debug airport data fetching
  console.log('Airport data:', { 
    fromAp, 
    toAp, 
    fromApError, 
    toApError,
    fromParams: params.from,
    toParams: params.to
  });
  const { data: sunData } = useSWR(
    params.date && params.time ? `/api/subsolar?date=${params.date}&time=${params.time}` : null,
    fetcher
  );
  
  // Fetch seat recommendation
  const { data: seatRecommendation } = useSWR(
    params.from && params.to && params.date && params.time && params.duration ? 
    `/api/seat-recommendation?from_iata=${params.from}&to_iata=${params.to}&date=${params.date}&time=${params.time}&duration=${params.duration}&preference=${params.preference || 'sunrise'}` : null,
    fetcher
  );

  /* build great-circle & helper values */
  const { coordsLatLng, line, totalKm } = useMemo(() => {
    // console.log('Calculating flight path:', { fromAp, toAp });
    
    if (!(fromAp?.lat && toAp?.lat && fromAp?.lon && toAp?.lon)) {
      console.log('Missing airport data:', { fromAp, toAp });
      return { coordsLatLng: [], line: null, totalKm: 0 };
    }
    
    try {
      // Validate coordinates are numbers
      if (isNaN(fromAp.lat) || isNaN(fromAp.lon) || isNaN(toAp.lat) || isNaN(toAp.lon)) {
        console.error('Invalid coordinates:', { fromAp, toAp });
        return { coordsLatLng: [], line: null, totalKm: 0 };
      }
      
      const gc = greatCircle([fromAp.lon, fromAp.lat], [toAp.lon, toAp.lat], { npoints: 128 });
      
      // Extract coordinates properly from the geometry
      let coordinates = [];
      if (gc.geometry && gc.geometry.coordinates) {
        try {
          console.log('Great circle structure:', {
            type: gc.geometry.type,
            coordinatesLength: gc.geometry.coordinates.length,
            firstSegment: gc.geometry.coordinates[0]?.slice(0, 3)
          });
          
          // Handle both LineString and MultiLineString
          if (gc.geometry.type === 'LineString') {
            // Simple LineString - direct coordinate extraction
            coordinates = gc.geometry.coordinates.map(([lon, lat]) => [lat, lon]);
          } else if (gc.geometry.type === 'MultiLineString') {
            // MultiLineString - flatten all line segments
            coordinates = [];
            for (const lineSegment of gc.geometry.coordinates) {
              if (Array.isArray(lineSegment)) {
                for (const coord of lineSegment) {
                  if (Array.isArray(coord) && coord.length === 2) {
                    const [lon, lat] = coord;
                    if (typeof lon === 'number' && typeof lat === 'number' && !isNaN(lon) && !isNaN(lat)) {
                      coordinates.push([lat, lon]);
                    }
                  }
                }
              }
            }
          }
        } catch (error) {
          console.error('Error extracting coordinates:', error);
          coordinates = [];
        }
      }
      
      console.log('Flight path calculated:', { coordinates: coordinates.length, totalKm: lineLength(gc, { units: 'kilometers' }) });
      
      // Validate the mapped coordinates
      if (coordinates.some(coord => coord.some(val => isNaN(val) || val === null))) {
        console.error('Invalid mapped coordinates:', coordinates);
        return { coordsLatLng: [], line: null, totalKm: 0 };
      }
      
      return {
        line: gc,
        totalKm: lineLength(gc, { units: 'kilometers' }),
        coordsLatLng: coordinates,
      };
    } catch (error) {
      console.error('Error calculating flight path:', error);
      return { coordsLatLng: [], line: null, totalKm: 0 };
    }
  }, [fromAp, toAp]);

  /* progress slider state 0–100 */
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  /* plane marker coordinate and rotation */
  const { planePoint, planeRotation } = useMemo(() => {
    if (!line || progress <= 0 || !coordsLatLng.length || totalKm <= 0) {
      return { planePoint: null, planeRotation: 0 };
    }
    
    try {
      const km = (progress / 100) * totalKm;
      const pt = along(line, km, { units: 'kilometers' }).geometry.coordinates;
      const planePoint = [pt[1], pt[0]];
      
      // Calculate bearing for rotation
      let planeRotation = 0;
      if (progress > 0 && progress < 100) {
        // Get a point slightly ahead to calculate direction
        const nextKm = Math.min(km + 10, totalKm);
        const nextPt = along(line, nextKm, { units: 'kilometers' }).geometry.coordinates;
        const nextPoint = [nextPt[1], nextPt[0]];
        
        // Calculate bearing between current and next point
        const dx = nextPoint[1] - planePoint[1]; // longitude difference
        const dy = nextPoint[0] - planePoint[0]; // latitude difference
        planeRotation = Math.atan2(dy, dx) * 180 / Math.PI;
      }
      
      return { planePoint, planeRotation };
    } catch (error) {
      console.error('Error calculating plane position:', error);
      return { planePoint: null, planeRotation: 0 };
    }
  }, [line, totalKm, progress, coordsLatLng]);

  /* sun point from backend */
  const sunPoint = sunData ? [sunData.lat, sunData.lon] : null;
  
  /* calculate sun position based on flight progress - client-side calculation */
  const currentSunPoint = useMemo(() => {
    if (!sunData || !params.date || !params.time || !durationMin) return sunPoint;
    
    // Calculate time elapsed based on progress
    const totalMinutes = durationMin;
    const elapsedMinutes = (progress / 100) * totalMinutes;
    
    // Parse original flight time
    const [year, month, day] = params.date.split('-').map(Number);
    const [hour, minute] = params.time.split(':').map(Number);
    const flightStartTime = new Date(year, month - 1, day, hour, minute);
    
    // Calculate current time during flight
    const currentFlightTime = new Date(flightStartTime.getTime() + (elapsedMinutes * 60 * 1000));
    
    // Calculate sun position based on time difference
    const timeDiffHours = elapsedMinutes / 60; // Convert to hours
    const earthRotationPerHour = 15; // Earth rotates 15 degrees per hour
    
    // Get original sun position
    const originalLat = sunData.lat;
    const originalLon = sunData.lon;
    
    // Calculate new longitude (sun moves west as time progresses)
    const newLon = originalLon - (timeDiffHours * earthRotationPerHour);
    
    // Latitude changes slightly due to Earth's axial tilt, but for simplicity we'll keep it constant
    const newLat = originalLat;
    
    return [newLat, newLon];
  }, [sunData, params.date, params.time, durationMin, progress]);

  /* Wrap longitude for sun marker to handle continuous movement */
  const wrapLongitude = (lon) => {
    // Normalize longitude to -180 to 180 range
    while (lon > 180) lon -= 360;
    while (lon < -180) lon += 360;
    return lon;
  };

  const wrappedSunPoint = currentSunPoint ? [currentSunPoint[0], wrapLongitude(currentSunPoint[1])] : null;
  
  // Debug sun movement
  console.log('Sun movement debug:', {
    progress,
    sunData,
    currentSunPoint,
    wrappedSunPoint,
    isPlaying
  });

  /* Prepare data for 3D Globe - optimized for performance */
  const globeData = useMemo(() => {
    if (!fromAp || !toAp) return { arcs: [], points: [] };

    // Flight path as arc - only recalculate when airports change
    const flightArc = {
      startLat: fromAp.lat,
      startLng: fromAp.lon,
      endLat: toAp.lat,
      endLng: toAp.lon,
      color: '#FF5722',
      stroke: 0.5,
      dashLength: 1,
      dashGap: 0.2,
      dashAnimateTime: 5000
    };

    // Static airport points - only recalculate when airports change
    const airportPoints = [
      {
        lat: fromAp.lat,
        lng: fromAp.lon,
        color: '#4CAF50',
        size: 1.0,
        label: (`${params.from}`).toUpperCase()
      },
      {
        lat: toAp.lat,
        lng: toAp.lon,
        color: '#F44336',
        size: 1.0,
        label: (`${params.to}`).toUpperCase()
      }
    ];

    return { arcs: [flightArc], staticPoints: airportPoints };
  }, [fromAp, toAp, params.from, params.to]);

  /* Dynamic points for plane and sun - separate memoization for performance */
  const dynamicPoints = useMemo(() => {
    const points = [];

    // Plane position
    if (planePoint) {
      points.push({
        lat: planePoint[0],
        lng: planePoint[1],
        color: '#2196F3',
        size: 2.5,
        label: 'PLANE'
      });
    }

    // Sun position
    if (wrappedSunPoint) {
      points.push({
        lat: wrappedSunPoint[0],
        lng: wrappedSunPoint[1],
        color: '#FFD54F',
        size: 4.0,
        label: 'SUN'
      });
    }

    return points;
  }, [planePoint, wrappedSunPoint, progress]); // Added progress dependency

  /* Combine static and dynamic points */
  const allPoints = useMemo(() => {
    return [...(globeData.staticPoints || []), ...dynamicPoints];
  }, [globeData.staticPoints, dynamicPoints]);

  /* leaflet icons for 2D map */
  const icon = (file) =>
    new L.Icon({ iconUrl: process.env.PUBLIC_URL + `/markers/${file}`, iconSize: [32, 32], iconAnchor: [16, 32] });
  const startIcon = icon('marker-start.png');
  const endIcon   = icon('marker-end.png');
  const sunIcon   = icon('sun-marker.png');
  
  /* Memoized plane icon creation to prevent recreation on every render */
  const createPlaneIcon = useMemo(() => {
    const planeImage = isDarkMode ? 'plane-dark.png' : 'plane.png';
    return (rotation) => new L.Icon({
      iconUrl: process.env.PUBLIC_URL + `/markers/${planeImage}`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      className: 'plane-icon',
      html: `<div style="transform: rotate(${rotation}deg); width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
               <img src="${process.env.PUBLIC_URL + `/markers/${planeImage}`}" style="width: 32px; height: 32px;" />
             </div>`
    });
  }, [isDarkMode]);


  /* Auto-play functionality */
  useEffect(() => {
    if (!isPlaying) return;
    
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          setIsPlaying(false);
          return 100;
        }
        return prev + speed;
      });
    }, 100);
    
    return () => clearInterval(interval);
  }, [isPlaying, speed]);

  /* Reset progress when play is pressed at 100% */
  const handlePlayPause = () => {
    if (progress >= 100 && !isPlaying) {
      setProgress(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  /* Keyboard controls */
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'ArrowLeft') setProgress(prev => Math.max(0, prev - 5));
      if (e.key === 'ArrowRight') setProgress(prev => Math.min(100, prev + 5));
      if (e.key === 'Home') setProgress(0);
      if (e.key === 'End') setProgress(100);
      if (e.key === ' ' || e.key === 'Space') {
        e.preventDefault();
        handlePlayPause();
      }
    };
    
    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [handlePlayPause]);



      return (
      <Stack sx={{ p: 4, height: '100vh', position: 'relative' }}>
        {/* Title Section */}
        <Box sx={{ mb: 4 }}>
          <Typography 
            variant="h4" 
            color="primary" 
            sx={{ 
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'scale(1.05)',
                textShadow: '0 4px 12px rgba(0,0,0,0.3)',
              },
            }}
            onClick={() => navigate('/')}
          >
            🌅 SunView
          </Typography>
        </Box>

        {/* Theme Toggle Button */}
        <IconButton 
          onClick={toggleTheme} 
          sx={{ 
            position: 'absolute', 
            top: 16, 
            right: 16, 
            zIndex: 1000,
            bgcolor: 'background.paper',
            boxShadow: 2,
            '&:hover': { 
              bgcolor: 'background.paper',
              transform: 'scale(1.1)',
            },
          }}
        >
          {isDarkMode ? <WbSunny /> : <DarkMode />}
        </IconButton>

        {/* Main Content Section */}
        <Stack direction="row" spacing={3} sx={{ flex: 1 }}>
          {/* Map/Globe Section - Left Side */}
          <Box sx={{ 
            width: '50%', 
            height: 'calc(100vh - 200px)', 
            maxHeight: 'calc(100vh - 200px)',
            borderRadius: 4,
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
            border: '2px solid rgba(255, 255, 255, 0.1)',
            transition: 'all 0.3s ease',
            position: 'relative',
            '&:hover': {
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.25)',
              transform: 'translateY(-2px)',
            },
          }}>
            {/* View Toggle Button */}
            <IconButton
              onClick={() => setIsGlobeView(!isGlobeView)}
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                zIndex: 1000,
                bgcolor: 'background.paper',
                boxShadow: 2,
                '&:hover': {
                  bgcolor: 'background.paper',
                  transform: 'scale(1.1)',
                },
              }}
            >
              {isGlobeView ? <Map /> : <Public />}
            </IconButton>
            
            {/* 3D Globe View */}
            {isGlobeView && (
              <div style={{ height: '100%', width: '100%', position: 'relative' }}>
                <Globe
                  ref={globeRef}
                  globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
                  backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
                  arcsData={globeData.arcs}
                  arcColor="color"
                  arcStroke="stroke"
                  arcDashLength="dashLength"
                  arcDashGap="dashGap"
                  arcDashAnimateTime="dashAnimateTime"
                  pointsData={allPoints}
                  pointColor="color"
                  pointSize="size"
                  pointRadius={1}
                  pointAltitude={0.01}
                  pointLabel="label"
                  pointLabelDotRadius={0}
                  pointLabelSize={1.0}
                  pointLabelResolution={6}
                  pointLabelAltitude={0.02}
                  pointLabelIncludeDot={false}
                  enablePointerInteraction={true}
                  enableGlobeRotation={true}
                  enableZoom={true}
                  enablePan={true}
                  globeRadius={200}
                  atmosphereColor={isDarkMode ? '#1a1a1a' : '#87CEEB'}
                  atmosphereAltitude={0.15}
                  width={1200}
                  height={1000}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%'
                  }}
                  onGlobeClick={() => {
                    // Optional: handle globe clicks
                  }}
                  onPointClick={(point) => {
                    console.log('Clicked point:', point);
                  }}
                  onPointHover={(point) => {
                    // Optional: handle point hover
                  }}


                />
              </div>
            )}
            
            {/* 2D Map View */}
            {!isGlobeView && (
              <div style={{ height: '100%', width: '100%' }}>
                <MapContainer
                  center={[20, 0]} 
                  zoom={2} 
                  style={{ height: '100%', width: '100%' }} 
                  scrollWheelZoom={true}
                  zoomControl={false}
                >
                  <MapZoomController fromAp={fromAp} toAp={toAp} />
                  <TileLayer 
                    url={isDarkMode 
                      ? "https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
                      : "https://tiles.stadiamaps.com/tiles/osm_bright/{z}/{x}/{y}{r}.png"
                    } 
                  />
                  {coordsLatLng.length > 1 && (
                    <>
                      <Polyline positions={coordsLatLng} color="red" />
                      <Marker position={coordsLatLng[0]} icon={startIcon} />
                      <Marker position={coordsLatLng.at(-1)} icon={endIcon} />
                      {wrappedSunPoint && (
                        <Marker position={wrappedSunPoint} icon={sunIcon} />
                      )}
                      {planePoint && (
                        <Marker 
                          position={planePoint} 
                          icon={createPlaneIcon(planeRotation)}
                        />
                      )}
                    </>
                  )}
                </MapContainer>
              </div>
            )}
          </Box>

      {/* Controls Section - Right Side */}
      <Stack 
        spacing={4}
        sx={{ 
          width: 'calc(50vw - 12px)', 
          height: 'calc(100vh - 80px)', 
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {/* Flight Info */}
        <Paper elevation={2} sx={{ 
          p: 3, 
          borderRadius: 3, 
          width: '100%', 
          maxWidth: 500,
          background: isDarkMode 
            ? 'rgba(255, 255, 255, 0.1)'
            : 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
          },
        }}>
          <Typography variant="h4" gutterBottom sx={{ 
            background: 'linear-gradient(45deg, #FF6B35, #FFD54F)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: 'bold',
            textAlign: 'center',
          }}>
            ✈️ Flight Details
          </Typography>
          <Stack spacing={2}>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="h6">
                <strong>From:</strong> {params.from.toUpperCase()}
              </Typography>
              <Typography variant="h6">
                <strong>To:</strong> {params.to.toUpperCase()}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={2}>
              <Typography variant="h6">
                <strong>Date:</strong> {params.date}
              </Typography>
              <Typography variant="h6">
                <strong>Time:</strong> {params.time} UTC
              </Typography>
            </Stack>
            <Typography variant="h6">
              <strong>Duration:</strong> {durationMin} min
            </Typography>
          </Stack>
        </Paper>

        {/* Seat Recommendation */}
        {seatRecommendation && !seatRecommendation.error && (
          <Paper elevation={3} sx={{ 
            p: 3, 
            borderRadius: 3, 
            width: '100%', 
            maxWidth: 500,
            background: seatRecommendation.preference === 'sunrise' 
              ? 'linear-gradient(135deg, #FF6B35 0%, #FFD54F 50%, #E3F2FD 100%)'
              : 'linear-gradient(135deg, #FF5722 0%, #FF9800 50%, #1A1A1A 100%)',
            color: 'white',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'translateY(-2px) scale(1.02)',
              boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
            },
            animation: 'pulse 2s ease-in-out infinite',
            '@keyframes pulse': {
              '0%, 100%': { transform: 'scale(1)' },
              '50%': { transform: 'scale(1.02)' },
            },
          }}>
                          <Stack spacing={2}>
                <Typography variant="h4" sx={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }} gutterBottom>
                  🪑 Seat Recommendation
                </Typography>
                
                {/* Recommended Side Display */}
                <Box sx={{ textAlign: 'center' }}>
                  <Chip
                    label={`${seatRecommendation.scores.recommended_side.toUpperCase()} SIDE`}
                    color="primary"
                    size="large"
                    sx={{
                      fontSize: '1.3rem',
                      fontWeight: 'bold',
                      py: 1.5,
                      px: 3,
                      bgcolor: seatRecommendation.scores.recommended_side === 'left' 
                        ? 'leftSeat.main' 
                        : 'rightSeat.main',
                      color: 'white',
                    }}
                  />
                </Box>
                
                {/* Preference Info */}
                <Typography variant="h6" sx={{ color: 'white', textAlign: 'center', opacity: 0.9 }}>
                  Based on {seatRecommendation.preference} preference
                </Typography>
              </Stack>
          </Paper>
        )}

        {/* Flight Progress Controls */}
        <Paper elevation={2} sx={{ 
          p: 3, 
          borderRadius: 3, 
          width: '100%', 
          maxWidth: 500,
          background: isDarkMode 
            ? 'rgba(255, 255, 255, 0.1)'
            : 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
          },
        }}>
          <Typography variant="h4" gutterBottom sx={{ 
            background: 'linear-gradient(45deg, #FF6B35, #FFD54F)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: 'bold',
            textAlign: 'center',
          }}>
            ✈️ Flight Progress
          </Typography>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Drag the slider to simulate plane movement along the flight path
          </Typography>
          

          
          {/* Custom Styled Slider */}
          <Slider
            value={progress}
            onChange={(_, v) => setProgress(v)}
            size="small"
            sx={{
              '& .MuiSlider-track': {
                background: 'linear-gradient(90deg, #FF6B35, #FFD54F)',
                height: 6,
              },
              '& .MuiSlider-thumb': {
                width: 20,
                height: 20,
                background: 'linear-gradient(45deg, #FF6B35, #FFD54F)',
                boxShadow: '0 4px 12px rgba(255, 107, 53, 0.4)',
                '&:hover': {
                  transform: 'scale(1.2)',
                  boxShadow: '0 6px 16px rgba(255, 107, 53, 0.6)',
                },
              },
              '& .MuiSlider-rail': {
                height: 6,
                opacity: 0.3,
              },
            }}
          />
          
          {/* Progress Labels */}
          <Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}>
            <Typography variant="h6">Departure</Typography>
            <Typography variant="h6" color="primary" fontWeight="bold">
              {Math.round(progress)}%
            </Typography>
            <Typography variant="h6">Arrival</Typography>
          </Stack>
          
          {/* Flight Statistics */}
          <Stack direction="row" justifyContent="space-between" sx={{ mt: 2, p: 2, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" color="primary" fontWeight="bold">
                {Math.round(totalKm)} km
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Distance
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" color="primary" fontWeight="bold">
                {durationMin} min
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Duration
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" color="primary" fontWeight="bold">
                {Math.round(progress * totalKm / 100)} km
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Progress
              </Typography>
            </Box>
          </Stack>
          
          {/* Departure and Arrival Times */}
          <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
            <Typography variant="body1" color="text.secondary">
              {params.time} UTC
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {(() => {
                const [hour, minute] = params.time.split(':').map(Number);
                const [year, month, day] = params.date.split('-').map(Number);
                const departureTime = new Date(year, month - 1, day, hour, minute);
                const arrivalTime = new Date(departureTime.getTime() + (durationMin * 60 * 1000));
                const hours = arrivalTime.getHours().toString().padStart(2, '0');
                const minutes = arrivalTime.getMinutes().toString().padStart(2, '0');
                return `${hours}:${minutes} UTC`;
              })()}
            </Typography>
          </Stack>
          
          {/* Control Buttons */}
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 3, justifyContent: 'center' }}>
            <IconButton 
              onClick={() => setProgress(0)} 
              size="medium"
              sx={{
                bgcolor: 'rgba(255, 107, 53, 0.1)',
                color: '#FF6B35',
                '&:hover': {
                  bgcolor: 'rgba(255, 107, 53, 0.2)',
                  transform: 'scale(1.1)',
                },
                transition: 'all 0.3s ease',
              }}
            >
              <SkipPrevious />
            </IconButton>
            <IconButton 
              onClick={handlePlayPause} 
              size="large"
              sx={{
                bgcolor: 'linear-gradient(45deg, #FF6B35, #FFD54F)',
                color: isDarkMode ? 'white' : '#2D1A0A',
                '&:hover': {
                  transform: 'scale(1.1)',
                  boxShadow: '0 6px 16px rgba(255, 107, 53, 0.4)',
                },
                transition: 'all 0.3s ease',
              }}
            >
              {isPlaying ? <Pause /> : <PlayArrow />}
            </IconButton>
            <IconButton 
              onClick={() => setProgress(100)} 
              size="medium"
              sx={{
                bgcolor: 'rgba(255, 213, 79, 0.1)',
                color: '#FFD54F',
                '&:hover': {
                  bgcolor: 'rgba(255, 213, 79, 0.2)',
                  transform: 'scale(1.1)',
                },
                transition: 'all 0.3s ease',
              }}
            >
              <SkipNext />
            </IconButton>
            
            {/* Speed Control */}
            <FormControl size="small" sx={{ minWidth: 60 }}>
              <Select 
                value={speed} 
                onChange={(e) => setSpeed(e.target.value)}
                sx={{ height: 28 }}
              >
                <MenuItem value={0.5}>0.5x</MenuItem>
                <MenuItem value={1}>1x</MenuItem>
                <MenuItem value={2}>2x</MenuItem>
              </Select>
            </FormControl>
          </Stack>
          
          {/* Flight Information */}
          <Stack spacing={1} sx={{ mt: 2, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              Flight Time: {Math.round((progress / 100) * durationMin)} min / {durationMin} min
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Distance: {Math.round((progress / 100) * totalKm)} km / {Math.round(totalKm)} km
            </Typography>
            {planePoint && currentSunPoint && (
              <Typography variant="body1" color="text.secondary">
                Sun Angle: {(() => {
                  // Calculate angle between plane and sun
                  const dx = currentSunPoint[1] - planePoint[1]; // longitude difference
                  const dy = currentSunPoint[0] - planePoint[0]; // latitude difference
                  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
                  const normalizedAngle = Math.round((angle + 360) % 360);
                  
                  // Determine left/right direction
                  let direction = '';
                  if (normalizedAngle > 0 && normalizedAngle < 180) {
                    direction = ' (Right)';
                  } else if (normalizedAngle > 180 && normalizedAngle < 360) {
                    direction = ' (Left)';
                  } else if (normalizedAngle === 0 || normalizedAngle === 180) {
                    direction = ' (Front/Back)';
                  }
                  
                  return normalizedAngle + direction;
                })()}
              </Typography>
            )}
          </Stack>
          
          {/* Keyboard Controls Help */}
          <Typography variant="body1" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
            Keyboard: ← → (5%), Home/End, Space (play/pause)
          </Typography>
        </Paper>

        {/* Home Button */}
        <Button 
          component={Link} 
          to="/" 
          variant="outlined" 
          size="medium"
          sx={{ 
            py: 1,
            px: 2,
            fontSize: '1rem',
            fontWeight: 'bold',
            borderRadius: 2,
            width: 'fit-content',
          }}
        >
          🏠 Home
        </Button>
      </Stack>
        </Stack>
      </Stack>
    );
  }