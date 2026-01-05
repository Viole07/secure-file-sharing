import { Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register'; // Import Register
import Upload from './pages/Upload';
import Download from './pages/Download';
import Dashboard from './pages/Dashboard';
import ProtectedRoute from '../components/ProtectedRoute';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} /> {/* Add this line */}
      <Route
        path="/upload"
        element={<ProtectedRoute><Upload /></ProtectedRoute>}
      />
      <Route
        path="/download/:uuid"
        element={<ProtectedRoute><Download /></ProtectedRoute>}
      />
      <Route
        path="/"
        element={<ProtectedRoute><Dashboard /></ProtectedRoute>}
      />
    </Routes>
  );
}