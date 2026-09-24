import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import OwnerApp from './OwnerApp';
import GuestApp from './GuestApp';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<OwnerApp />} />
        <Route path="/guest/:token" element={<GuestApp />} />
      </Routes>
    </BrowserRouter>
  );
}
