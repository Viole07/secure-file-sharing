import { useState } from 'react';
import axios from 'axios';

function Upload() {
  const [file, setFile] = useState(null);
  const [expiresInHours, setExpiresInHours] = useState(24);
  const [maxDownloads, setMaxDownloads] = useState(3);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [result, setResult] = useState(null);
  const [otp, setOtp] = useState('');
  const [qr, setQr] = useState('');
  const [message, setMessage] = useState('');

  const token = localStorage.getItem('token'); // 🔐 Assuming user is logged in

  const handleUpload = async () => {
    if (!file) return alert('Please select a file.');

    try {
      // 1. Get signed upload URL from backend
      const { data: uploadData } = await axios.get(
  'http://localhost:5000/api/files/upload-url',
  {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }
);

      // 2. Upload file to Cloudinary
      const formData = new FormData();
      formData.append('file', file);
      formData.append('timestamp', uploadData.timestamp);
      formData.append('api_key', uploadData.apiKey);
      formData.append('signature', uploadData.signature);
      formData.append('folder', uploadData.folder);

      const cloudRes = await axios.post(
        `https://api.cloudinary.com/v1_1/${uploadData.cloudName}/auto/upload`,
        formData
      );

      // 3. Submit metadata to backend
      const saveRes = await axios.post(
        'http://localhost:5000/api/files/save',
        {
          filename: file.name,
          cloudinaryUrl: cloudRes.data.secure_url,
          cloudinaryPublicId: cloudRes.data.public_id,
          expiresInHours,
          maxDownloads,
          recipientEmail
        },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }}
      );

      if (saveRes.data.qr) {
        setResult(saveRes.data.downloadLink);
        setOtp(saveRes.data.otp);
        setQr(saveRes.data.qr);
        setMessage('Share the QR code + OTP with recipient.');
      } else {
        setMessage('✅ Link sent to email successfully!');
      }
    } catch (err) {
      console.error(err);
      alert('Upload failed');
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Secure File Upload</h2>

      <input type="file" onChange={(e) => setFile(e.target.files[0])} /><br /><br />

      <input
        type="number"
        placeholder="Expiry in hours"
        value={expiresInHours}
        onChange={(e) => setExpiresInHours(e.target.value)}
      /><br /><br />

      <input
        type="number"
        placeholder="Max downloads"
        value={maxDownloads}
        onChange={(e) => setMaxDownloads(e.target.value)}
      /><br /><br />

      <input
        type="email"
        placeholder="Recipient Email (optional)"
        value={recipientEmail}
        onChange={(e) => setRecipientEmail(e.target.value)}
      /><br /><br />

      <button onClick={handleUpload}>Upload & Share</button>

      <p>{message}</p>

      {result && (
        <>
          <p><strong>Link:</strong> {result}</p>
          <p><strong>OTP:</strong> {otp}</p>
          <img src={qr} alt="QR Code" />
        </>
      )}
      <button onClick={() => {
  localStorage.removeItem('token');
  window.location.href = '/login';
}}>Logout</button>

    </div>
  );
}

export default Upload;
