import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function Dashboard() {
  const [files, setFiles] = useState([]);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const logout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const fetchFiles = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/files/mine', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setFiles(res.data);
    } catch (err) {
      console.error('Failed to fetch files:', err);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const revokeFile = async (id) => {
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
    <div style={{ padding: '2rem' }}>
      <h2>Dashboard</h2>
      <div style={{ marginBottom: '1rem' }}>
        <Link to="/upload"><button>Upload New File</button></Link>
        <button style={{ marginLeft: '1rem' }} onClick={logout}>Logout</button>
      </div>

      <h3>Uploaded Files</h3>
      {files.length === 0 ? (
        <p>No files uploaded yet.</p>
      ) : (
        <table border="1" cellPadding="8">
          <thead>
            <tr>
              <th>File</th>
              <th>Created</th>
              <th>Expires</th>
              <th>Downloads</th>
              <th>Status</th>
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
      <button onClick={() => revokeFile(file._id)}>❌ Revoke</button>
    )}
  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
