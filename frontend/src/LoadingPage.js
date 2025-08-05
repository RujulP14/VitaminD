import React from 'react';
import { Box, Typography, CircularProgress, Stack } from '@mui/material';
import { FlightTakeoff } from '@mui/icons-material';
import { useTheme } from './ThemeContext';

export default function LoadingPage({ onValidationComplete, formData }) {
  const { isDarkMode } = useTheme();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: isDarkMode 
          ? 'linear-gradient(135deg, #FF5722 0%, #FF9800 50%, #1A1A1A 100%)'
          : 'linear-gradient(135deg, #FF6B35 0%, #FFD54F 50%, #E3F2FD 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Animated Background Elements */}
      <Box
        sx={{
          position: 'absolute',
          top: '20%',
          left: '10%',
          animation: 'float 3s ease-in-out infinite',
          '@keyframes float': {
            '0%, 100%': { transform: 'translateY(0px)' },
            '50%': { transform: 'translateY(-20px)' },
          },
        }}
      >
        <FlightTakeoff sx={{ fontSize: 60, color: 'rgba(255,255,255,0.3)' }} />
      </Box>
      
      <Box
        sx={{
          position: 'absolute',
          top: '60%',
          right: '15%',
          animation: 'float 4s ease-in-out infinite',
          animationDelay: '1s',
          '@keyframes float': {
            '0%, 100%': { transform: 'translateY(0px)' },
            '50%': { transform: 'translateY(-15px)' },
          },
        }}
      >
        <FlightTakeoff sx={{ fontSize: 40, color: 'rgba(255,255,255,0.2)' }} />
      </Box>

      {/* Main Content */}
      <Stack
        spacing={4}
        alignItems="center"
        sx={{
          background: isDarkMode 
            ? 'rgba(255, 255, 255, 0.1)'
            : 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(20px)',
          borderRadius: 4,
          p: 6,
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          maxWidth: 500,
          textAlign: 'center',
        }}
      >
        <Typography
          variant="h3"
          sx={{
            background: 'linear-gradient(45deg, #FF6B35, #FFD54F)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: 'bold',
            mb: 2,
          }}
        >
          🌅 SunView
        </Typography>

        <CircularProgress
          size={80}
          thickness={4}
          sx={{
            color: '#FF6B35',
            mb: 3,
          }}
        />

        <Typography variant="h5" color="text.primary" gutterBottom>
          Validating Airports...
        </Typography>

        <Typography variant="body1" color="text.secondary" sx={{ opacity: 0.8 }}>
          Checking {formData?.from?.toUpperCase()} → {formData?.to?.toUpperCase()}
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.6, mt: 2 }}>
          This may take a few seconds for new airports
        </Typography>
      </Stack>
    </Box>
  );
} 