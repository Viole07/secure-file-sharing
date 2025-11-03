import { Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Upload from './pages/Upload';
import Download from './pages/Download';
import Dashboard from './pages/Dashboard';
import ProtectedRoute from '../components/ProtectedRoute'; // This is the correct path from your file
// Note: Your file had '../components/ProtectedRoute' so I kept it.
// If Navbar.jsx is in 'components', this should be correct.

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/upload"
        element={
          <ProtectedRoute>
            <Upload />
          </ProtectedRoute>
        }
      />
      <Route
        path="/download/:uuid"
        element={
          <ProtectedRoute>
            <Download />
          </ProtectedRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
