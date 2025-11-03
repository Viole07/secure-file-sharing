import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar'; // Import Navbar

export default function Dashboard() {
  const [files, setFiles] = useState([]);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  // LOGOUT FUNCTION IS NOW IN Navbar.jsx

  const fetchFiles = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/files/mine', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      setFiles(res.data);
    } catch (err) {
      console.error('Failed to fetch files:', err);
      // Handle auth error by logging out
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        console.error('Authentication error, logging out.');
        localStorage.removeItem('token');
        navigate('/login');
      }
    }
  };

  useEffect(() => {
    // fetchFiles(); // This might run before token is set on initial load
    if (token) {
      fetchFiles();
    } else {
      // If no token, redirect to login
      navigate('/login');
    }
  }, [token, navigate]); // Rerun effect if token changes

  const revokeFile = async (id) => {
    // ◀️ RESTORED ORIGINAL LOGIC
    const confirm = window.confirm('Are you sure you want to revoke this file?');
    if (!confirm) return;

    try {
      await axios.delete(`http://localhost:5000/api/files/delete/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('File revoked and deleted from Cloudinary');
      fetchFiles(); // refresh the table
    } catch (err) {
      console.error('Error revoking file:', err);
      alert('Error revoking file');
    }
  };

  return (
    <>
      <Navbar />
      <div className="page-container">
        <h2>Dashboard</h2>
        
        {/* ◀️ ADDED FLEXBOX FOR BETTER ALIGNMENT */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '1.5rem' 
        }}>
          <h3>Uploaded Files</h3>
          <Link to="/upload">
            <button>Upload New File</button>
          </Link>
        </div>

        {files.length === 0 ? (
          <p>No files uploaded yet.</p>
        ) : (
          <div className="table-container">
            <table className="file-table">
              <thead>
                <tr>
                  <th>File</th>
                  <th>Created</th>
                  <th>Expires</th>
                  <th>Downloads</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {files.map(file => {
                  const expired = new Date(file.expiresAt) < new Date();
                  const status = file.isRevoked
                    ? 'Revoked'
                    : expired
                    ? 'Expired'
                    : 'Active';

                  return (
                    <tr key={file._id}>
                      <td>{file.filename}</td>
                      <td>{new Date(file.createdAt).toLocaleString()}</td>
                      <td>{new Date(file.expiresAt).toLocaleString()}</td>
                      <td>{file.currentDownloads} / {file.maxDownloads}</td>
                      <td>{status}</td>
                      <td>
                        {!file.isRevoked && (
                          <button onClick={() => revokeFile(file._id)} className="btn-danger">
                            ❌ Revoke {/* ◀️ RESTORED BUTTON TEXT */}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

