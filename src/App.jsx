import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import OwnerApp from './OwnerApp';
import GuestApp from './GuestApp';
import Login from './components/Login';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<OwnerApp />} />
        <Route path="/guest/:token" element={<GuestApp />} />
        <Route path="/login-preview" element={<Login />} />
      </Routes>
    </BrowserRouter>
  );
}
