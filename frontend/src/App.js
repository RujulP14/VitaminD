import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProviderWrapper } from './ThemeContext';
import Home from './Home';
import Results from './Results';

export default function App() {
  return (
    <ThemeProviderWrapper>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/results" element={<Results />} />
        </Routes>
      </BrowserRouter>
    </ThemeProviderWrapper>
  );
}
