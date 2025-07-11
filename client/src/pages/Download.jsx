import { useParams } from 'react-router-dom';
import { useState } from 'react';
import axios from 'axios';

function Download() {
  const { uuid } = useParams();
  const [otp, setOtp] = useState('');
  const [message, setMessage] = useState('');
  const [fileUrl, setFileUrl] = useState('');

const handleDownload = async () => {
  try {
    const token = localStorage.getItem("token");

    const res = await axios.post(
      `http://localhost:5000/api/files/verify-download/${uuid}`,
      { otp },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    setFileUrl(res.data.downloadUrl);
    setMessage('✅ OTP verified! Click below to download.');
  } catch (err) {
    setMessage('❌ Invalid OTP or expired link');
  }
};


  return (
    <div style={{ padding: '2rem' }}>
      <h2>Enter OTP to Download File</h2>
      <input
        type="text"
        placeholder="Enter 6-digit OTP"
        value={otp}
        onChange={(e) => setOtp(e.target.value)}
        style={{ padding: '0.5rem', marginRight: '0.5rem' }}
      />
      <button onClick={handleDownload}>Verify</button>
      <p>{message}</p>

      {fileUrl && (
        <a href={fileUrl} target="_blank" rel="noopener noreferrer">
          ⬇️ Download File
        </a>
      )}
      <button onClick={() => {
  localStorage.removeItem('token');
  window.location.href = '/login';
}}>Logout</button>

    </div>
  );
}

export default Download;
