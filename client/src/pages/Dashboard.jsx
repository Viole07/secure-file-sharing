import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';

export default function Dashboard() {
  const [files, setFiles] = useState([]);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const fetchFiles = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/files/mine', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFiles(res.data);
    } catch (err) {
      if (err.response?.status === 401) navigate('/login');
    }
  };

  useEffect(() => {
    if (token) fetchFiles();
    else navigate('/login');
  }, [token]);

  const revokeFile = async (id) => {
    if (!window.confirm('Shred this file? This action is irreversible.')) return;
    try {
      await axios.delete(`http://localhost:5000/api/files/delete/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchFiles();
    } catch (err) {
      alert('Error shredding file');
    }
  };

  return (
    <>
      <Navbar />
      <div className="page-container">
        <h2>Your Secure Files</h2>
        <div className="table-container">
          <table className="file-table">
            <thead>
              <tr>
                <th>File Name</th>
                <th>Recipient</th>
                <th>Status</th>
                <th>Downloads</th>
                <th>Expires</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {files.map(file => {
                const isExpired = new Date(file.expiresAt) < new Date();
                const isLimitReached = file.currentDownloads >= file.maxDownloads;
                const status = file.isRevoked ? 'Shredded' : (isExpired || isLimitReached ? 'Expired' : 'Active');

                return (
                  <tr key={file._id}>
                    <td>{file.filename}</td>
                    <td>{file.recipientPublicKey.substring(0, 10)}...</td>
                    <td className={`status-${status.toLowerCase()}`}>{status}</td>
                    <td>{file.currentDownloads} / {file.maxDownloads}</td>
                    <td>{new Date(file.expiresAt).toLocaleString()}</td>
                    <td>
                      {!file.isRevoked && (
                        <button onClick={() => revokeFile(file._id)} className="btn-danger">Shred</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}