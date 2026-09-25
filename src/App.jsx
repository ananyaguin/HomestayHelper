import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import OwnerApp from './OwnerApp';
import GuestApp from './GuestApp';
import GuestRoomBookingPage from './components/guest/GuestRoomBookingPage';
import Login from './components/Login';
import { api, setOwnerToken, getOwnerToken, clearTokens } from './services/api';

function ProtectedOwnerRoute({ children }) {
  const token = getOwnerToken();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function LoginPage() {
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (getOwnerToken()) {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async ({ mode, phone, password, fullName, recoveryEmail, confirmPassword }) => {
    setErrorMessage('');
    try {
      if (mode === 'login') {
        const data = await api.post('/api/auth/login', { phone, password });
        if (data && data.token) {
          setOwnerToken(data.token);
          navigate('/', { replace: true });
        } else {
          setErrorMessage('Login failed. No authentication token received.');
        }
      } else if (mode === 'signup') {
        const data = await api.post('/api/auth/signup', {
          name: fullName,
          phone,
          recoveryEmail,
          password,
          confirmPassword
        });
        if (data && data.token) {
          setOwnerToken(data.token);
          navigate('/', { replace: true });
        } else {
          setErrorMessage('Account registration failed. Invalid response.');
        }
      }
    } catch (err) {
      console.error('[Login] Authentication error:', err);
      const msg = err.data?.error || err.message || 'Authentication request failed.';
      setErrorMessage(msg);
    }
  };

  return <Login onSubmit={handleSubmit} errorMessage={errorMessage} />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <ProtectedOwnerRoute>
              <OwnerApp onLogout={() => clearTokens()} />
            </ProtectedOwnerRoute>
          }
        />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/login-preview" element={<LoginPage />} />
        <Route path="/guest/room/:roomId" element={<GuestRoomBookingPage />} />
        <Route path="/guest/rooms/:roomId" element={<GuestRoomBookingPage />} />
        <Route path="/guest/:token" element={<GuestApp />} />
      </Routes>
    </BrowserRouter>
  );
}
