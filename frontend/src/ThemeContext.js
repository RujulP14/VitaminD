import React, { createContext, useContext, useState, useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProviderWrapper = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved === null) return false;
    try {
      return JSON.parse(saved);
    } catch {
      // If saved value is not valid JSON, default to light mode
      return false;
    }
  });

  // Save theme preference to localStorage
  useEffect(() => {
    localStorage.setItem('theme', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  // Get current time for dynamic theming
  const getCurrentHour = () => new Date().getHours();

  // Create sunrise theme (light mode)
  const lightTheme = createTheme({
    palette: {
      mode: 'light',
      primary: {
        main: '#FF6B35', // Warm orange (sunrise)
        light: '#FF8A65',
        dark: '#E64A19',
      },
      secondary: {
        main: '#FFD54F', // Golden yellow
        light: '#FFE082',
        dark: '#FFB300',
      },
      background: {
        default: '#FFF8E1', // Very light warm cream
        paper: '#FFFFFF',
      },
      text: {
        primary: '#3E2723', // Deep brown
        secondary: '#5D4037',
      },
      // Custom colors
      sunrise: '#FF6B35',
      sunset: '#FF5722',
      sky: '#E3F2FD',
      // Seat recommendation colors
      leftSeat: {
        main: '#4CAF50', // Green for left
        light: '#81C784',
        dark: '#388E3C',
      },
      rightSeat: {
        main: '#2196F3', // Blue for right
        light: '#64B5F6',
        dark: '#1976D2',
      },
    },
    components: {
      MuiSlider: {
        styleOverrides: {
          track: {
            background: 'linear-gradient(90deg, #FF6B35, #FFD54F)',
          },
          thumb: {
            border: '2px solid #FF6B35',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 12,
          },
        },
      },
    },
  });

  // Create sunset theme (dark mode)
  const darkTheme = createTheme({
    palette: {
      mode: 'dark',
      primary: {
        main: '#FF5722', // Deep orange-red (sunset)
        light: '#FF8A65',
        dark: '#D84315',
      },
      secondary: {
        main: '#FF9800', // Orange
        light: '#FFB74D',
        dark: '#F57C00',
      },
      background: {
        default: '#1A1A1A', // Deep dark
        paper: '#2D2D2D',
      },
      text: {
        primary: '#FFFFFF',
        secondary: '#BDBDBD',
      },
      // Custom colors
      sunset: '#FF5722',
      night: '#1A1A1A',
      stars: '#E3F2FD',
      // Seat recommendation colors
      leftSeat: {
        main: '#66BB6A', // Lighter green for dark mode
        light: '#A5D6A7',
        dark: '#4CAF50',
      },
      rightSeat: {
        main: '#42A5F5', // Lighter blue for dark mode
        light: '#90CAF9',
        dark: '#1976D2',
      },
    },
    components: {
      MuiSlider: {
        styleOverrides: {
          track: {
            background: 'linear-gradient(90deg, #FF5722, #FF9800)',
          },
          thumb: {
            border: '2px solid #FF5722',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 12,
          },
        },
      },
    },
  });

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };



  const theme = isDarkMode ? darkTheme : lightTheme;

  const value = {
    isDarkMode,
    toggleTheme,
    getCurrentHour,
  };

  return (
    <ThemeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
}; 