import React, { useState, useEffect } from 'react';
import { Stack, TextField, Button, MenuItem, Typography, IconButton, Box, Fade, Grow, CircularProgress } from '@mui/material';
import { WbSunny, DarkMode, FlightTakeoff, FlightLand, LocationOn, Schedule, AccessTime } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTheme } from './ThemeContext';
import LoadingPage from './LoadingPage';

export default function Home() {
  const nav = useNavigate();
  const { isDarkMode, toggleTheme } = useTheme();
  
  const [form, setForm] = useState({
    from: '',
    to: '',
    date: '',
    time: '',
    duration: '',
    preference: 'sunrise',
  });

  const handleChange = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value });
    // Clear error when user starts typing
    if (error) {
      setError('');
    }
  };

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [validationResult, setValidationResult] = useState(null);

  // Common form field styles for dark mode
  const formFieldStyles = {
    '& .MuiOutlinedInput-root': {
      transition: 'all 0.3s ease',
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      },
      '&.Mui-focused': {
        transform: 'translateY(-2px)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
      },
      '& .MuiOutlinedInput-notchedOutline': {
        borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.23)',
      },
      '&:hover .MuiOutlinedInput-notchedOutline': {
        borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.4)',
      },
      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
        borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
        borderWidth: '2px',
      },
    },
    '& .MuiInputLabel-root': {
      color: isDarkMode ? '#FFFFFF' : 'text.secondary',
      fontWeight: isDarkMode ? 'bold' : 'normal',
      '&.Mui-focused': {
        color: isDarkMode ? '#FFFFFF' : 'text.secondary',
      },
    },
    '& .MuiOutlinedInput-input': {
      color: isDarkMode ? '#FFFFFF' : 'text.primary',
      fontWeight: isDarkMode ? 'bold' : 'normal',
    },
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check if origin and destination are the same
    if (form.from.toUpperCase() === form.to.toUpperCase()) {
      setError('Cannot travel to the same airport');
      return;
    }
    
    // Check for negative or zero duration
    if (parseInt(form.duration) <= 0) {
      setError('Flight duration must be greater than 0 minutes');
      return;
    }
    
    setError(''); // Clear any previous errors
    setIsLoading(true); // Start loading
    
    // Validate airports before redirecting
    try {
      const [fromResponse, toResponse] = await Promise.all([
        fetch(`/api/airport/${form.from}`),
        fetch(`/api/airport/${form.to}`)
      ]);
      
      const fromData = await fromResponse.json();
      const toData = await toResponse.json();
      
      console.log('From airport response:', fromData);
      console.log('To airport response:', toData);
      console.log('From response status:', fromResponse.status);
      console.log('To response status:', toResponse.status);
      
      // Check if response has error field or is missing required data
      if (!fromResponse.ok || fromData.error || !fromData.iata || !fromData.lat || !fromData.lon) {
        setValidationResult({ success: false, error: `Invalid departure airport: ${form.from}` });
        setIsLoading(false);
        return;
      }
      
      if (!toResponse.ok || toData.error || !toData.iata || !toData.lat || !toData.lon) {
        setValidationResult({ success: false, error: `Invalid arrival airport: ${form.to}` });
        setIsLoading(false);
        return;
      }
      
      // Both airports are valid, redirect to results
      setValidationResult({ success: true });
      const q = new URLSearchParams(form).toString();
      nav(`/results?${q}`);
      
    } catch (error) {
      setValidationResult({ success: false, error: 'Network error. Please try again.' });
      setIsLoading(false);
    }
  };

  // Animated background elements
  const [airplanes, setAirplanes] = useState([]);
  
  useEffect(() => {
    // Create floating airplanes
    const newAirplanes = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 8,
      duration: 8 + Math.random() * 10,
    }));
    setAirplanes(newAirplanes);
  }, []);

  // Handle validation result
  useEffect(() => {
    if (validationResult && !validationResult.success) {
      setError(validationResult.error);
      setValidationResult(null); // Reset for next attempt
    }
  }, [validationResult]);

  // Show loading page if validation is in progress
  if (isLoading) {
    return <LoadingPage formData={form} />;
  }



  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: isDarkMode 
          ? 'linear-gradient(135deg, #FF5722 0%, #FF9800 50%, #1A1A1A 100%)' // Sunset theme
          : 'linear-gradient(135deg, #FF6B35 0%, #FFD54F 50%, #E3F2FD 100%)', // Sunrise theme
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: isDarkMode 
            ? 'radial-gradient(circle at 20% 80%, rgba(255, 87, 34, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 152, 0, 0.1) 0%, transparent 50%)'
            : 'radial-gradient(circle at 20% 80%, rgba(255, 107, 53, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 213, 79, 0.1) 0%, transparent 50%)',
          animation: 'pulse 8s ease-in-out infinite',
        },
        '@keyframes pulse': {
          '0%, 100%': { opacity: 0.3 },
          '50%': { opacity: 0.6 },
        },
      }}
    >
      {/* Theme Toggle Button */}
      <IconButton
        onClick={toggleTheme}
        sx={{
          position: 'absolute',
          top: 16,
          right: 16,
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

      {/* Animated Airplanes */}
      {airplanes.map((plane) => (
        <Box
          key={plane.id}
          sx={{
            position: 'absolute',
            left: `${plane.x}%`,
            top: `${plane.y}%`,
            animation: `float ${plane.duration}s linear infinite`,
            animationDelay: `${plane.delay}s`,
            opacity: 0.4,
            '@keyframes float': {
              '0%': {
                transform: 'translateX(-100px)',
                opacity: 0,
              },
              '10%': {
                opacity: 0.4,
              },
              '90%': {
                opacity: 0.4,
              },
              '100%': {
                transform: 'translateX(calc(100vw + 100px))',
                opacity: 0,
              },
            },
          }}
        >
          <FlightTakeoff 
            sx={{ 
              fontSize: 28, 
              color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.5)',
              transform: 'rotate(45deg)',
            }} 
          />
        </Box>
      ))}
  
      <Grow in={true} timeout={1000}>
        <Stack 
          component="form" 
          spacing={3} 
          sx={{ 
            p: 4, 
            maxWidth: 700,
            background: isDarkMode 
              ? 'rgba(45, 26, 10, 0.85)'
              : 'rgba(255, 255, 255, 0.9)',
            borderRadius: 3,
            boxShadow: isDarkMode 
              ? '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1)'
              : '0 8px 32px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            transform: 'perspective(1000px) rotateX(5deg)',
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'perspective(1000px) rotateX(0deg) translateY(-5px)',
              boxShadow: isDarkMode 
                ? '0 12px 40px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.15)'
                : '0 12px 40px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.3)',
            },
          }} 
          onSubmit={handleSubmit}
        >
          <Fade in={true} timeout={1500}>
            <Typography 
              variant="h3" 
              textAlign="center" 
              gutterBottom
              sx={{
                background: isDarkMode
                  ? 'linear-gradient(45deg, #FF6B35, #FFD54F)'
                  : 'linear-gradient(45deg, #FF5722, #FF9800)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontWeight: 'bold',
                textShadow: '0 2px 4px rgba(0,0,0,0.1)',
                animation: 'glow 2s ease-in-out infinite alternate',
                '@keyframes glow': {
                  '0%': { filter: 'brightness(1)' },
                  '100%': { filter: 'brightness(1.1)' },
                },
                display: 'inline-block',
              }}
            >
              <span style={{ WebkitTextFillColor: 'initial', background: 'none', marginRight: 8 }}>
                {isDarkMode ? '🌇' : '🌅'}
              </span>
              Vitamin D Seat Finder
            </Typography>
          </Fade>
          
          <Fade in={true} timeout={2000}>
            <Typography 
              variant="body1" 
              textAlign="center" 
              gutterBottom
              sx={{
                fontStyle: 'italic',
                opacity: 0.8,
                color: isDarkMode ? '#FFFFFF' : 'text.secondary',
                fontWeight: isDarkMode ? 'bold' : 'normal',
                animation: 'fadeInUp 0.8s ease-out',
                '@keyframes fadeInUp': {
                  '0%': { opacity: 0, transform: 'translateY(20px)' },
                  '100%': { opacity: 0.8, transform: 'translateY(0)' },
                },
              }}
            >
              Find the perfect seat for your sunrise or sunset views
            </Typography>
          </Fade>
        
        {error && (
          <Typography 
            variant="body2" 
            textAlign="center" 
            sx={{ 
              fontWeight: 'bold',
              color: isDarkMode ? '#ff0000' : 'error.main',
              textShadow: isDarkMode ? '0 0 8px rgba(255, 0, 0, 0.8)' : 'none',
            }}
          >
            {error}
          </Typography>
        )}
        
        <Fade in={true} timeout={2500}>
          <TextField 
            placeholder="JFK" 
            label="From (IATA)" 
            value={form.from} 
            onChange={handleChange('from')} 
            required 
            fullWidth
            InputProps={{
              startAdornment: <LocationOn sx={{ mr: 1, color: 'primary.main' }} />,
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                },
                '&.Mui-focused': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                },
              },
              '& .MuiInputLabel-root': {
                color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'text.secondary',
              },
              '& .MuiOutlinedInput-input': {
                color: isDarkMode ? 'rgba(255, 255, 255, 0.9)' : 'text.primary',
              },
            }}
          />
        </Fade>
        
        <Fade in={true} timeout={2700}>
          <TextField 
            placeholder="BOM" 
            label="To (IATA)" 
            value={form.to} 
            onChange={handleChange('to')} 
            required 
            fullWidth
            InputProps={{
              startAdornment: <FlightLand sx={{ mr: 1, color: 'primary.main' }} />,
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                },
                '&.Mui-focused': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                },
              },
              '& .MuiInputLabel-root': {
                color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'text.secondary',
              },
              '& .MuiOutlinedInput-input': {
                color: isDarkMode ? 'rgba(255, 255, 255, 0.9)' : 'text.primary',
              },
            }}
          />
        </Fade>
        
        <Fade in={true} timeout={2900}>
          <TextField 
            type="date" 
            label="Date" 
            InputLabelProps={{ shrink: true }} 
            value={form.date} 
            onChange={handleChange('date')} 
            required 
            fullWidth
            InputProps={{
              startAdornment: <Schedule sx={{ mr: 1, color: 'primary.main' }} />,
            }}
            sx={formFieldStyles}
          />
        </Fade>
        
        <Fade in={true} timeout={3100}>
          <TextField 
            type="time" 
            label="Time (UTC) (24 hrs)" 
            placeholder="12:30" 
            InputLabelProps={{ shrink: true }} 
            value={form.time} 
            onChange={handleChange('time')} 
            required 
            fullWidth
            InputProps={{
              startAdornment: <AccessTime sx={{ mr: 1, color: 'primary.main' }} />,
            }}
            sx={formFieldStyles}
          />
        </Fade>
        
        <Fade in={true} timeout={3300}>
          <TextField 
            type="number" 
            label="Flight Duration (min)" 
            placeholder="180" 
            value={form.duration} 
            onChange={handleChange('duration')} 
            required 
            fullWidth
            inputProps={{ min: 1 }}
            InputProps={{
              startAdornment: <FlightTakeoff sx={{ mr: 1, color: 'primary.main' }} />,
            }}
            sx={formFieldStyles}
          />
        </Fade>
        
        <Fade in={true} timeout={3500}>
          <TextField 
            select 
            label="Preference" 
            value={form.preference} 
            onChange={handleChange('preference')}
            fullWidth
            sx={formFieldStyles}
          >
            <MenuItem value="sunrise">🌅 Sunrise</MenuItem>
            <MenuItem value="sunset">🌇 Sunset</MenuItem>
          </TextField>
        </Fade>
        
        <Fade in={true} timeout={3700}>
          <Button 
            type="submit" 
            variant="contained" 
            size="large"
            sx={{ 
              mt: 2,
              py: 1.5,
              fontSize: '1.1rem',
              background: isDarkMode 
                ? 'linear-gradient(45deg, #FF6B35, #FFD54F)'
                : 'linear-gradient(45deg, #FF5722, #FF9800)',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-3px) scale(1.02)',
                boxShadow: '0 8px 25px rgba(0,0,0,0.3)',
                background: isDarkMode 
                  ? 'linear-gradient(45deg, #FF5722, #FFB74D)'
                  : 'linear-gradient(45deg, #F4511E, #FF8A65)',
              },
              '&:active': {
                transform: 'translateY(-1px) scale(0.98)',
              },
            }}
          >
            Find Perfect Seats
          </Button>
        </Fade>
        </Stack>
      </Grow>
    </Box>
  );
}
