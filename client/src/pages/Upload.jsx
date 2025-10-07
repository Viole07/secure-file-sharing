// client/src/pages/Upload.jsx
import { useState } from 'react';
import axios from 'axios';
import { encryptFileData } from '../aesUtils';

function Upload() {
  const [file, setFile] = useState(null);
  const [expiresInHours, setExpiresInHours] = useState(24);
  const [maxDownloads, setMaxDownloads] = useState(3);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [qr, setQr] = useState('');
  const [message, setMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [fullDownloadLink, setFullDownloadLink] = useState(''); // State for the full link

  const token = localStorage.getItem('token');

  const handleUpload = async () => {
    if (!file) return alert('Please select a file.');
    setIsUploading(true);
    setFullDownloadLink(''); // Reset previous link
    setMessage('Generating OTP and encrypting file...');

    try {
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const encryptedData = await encryptFileData(file, generatedOtp);
      setMessage('Getting upload URL...');

      const { data: uploadData } = await axios.get(
        'http://localhost:5000/api/files/upload-url',
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      setMessage('Uploading encrypted file...');
      const formData = new FormData();
      formData.append('file', new Blob([encryptedData]));
      formData.append('timestamp', uploadData.timestamp);
      formData.append('api_key', uploadData.apiKey);
      formData.append('signature', uploadData.signature);
      formData.append('folder', uploadData.folder);

      const cloudRes = await axios.post(
        `https://api.cloudinary.com/v1_1/${uploadData.cloudName}/raw/upload`,
        formData
      );

      setMessage('Saving file details...');
      const saveRes = await axios.post(
        'http://localhost:5000/api/files/save',
        {
          filename: file.name,
          fileType: file.type,
          cloudinaryUrl: cloudRes.data.secure_url,
          cloudinaryPublicId: cloudRes.data.public_id,
          expiresInHours,
          maxDownloads,
          recipientEmail,
          otp: generatedOtp
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (saveRes.data.qr) {
        // Construct the full download link for the sender to share
        const link = `${window.location.origin}/download/${saveRes.data.uuid}`;
        setFullDownloadLink(link);
        setOtp(saveRes.data.otp);
        setQr(saveRes.data.qr);
        setMessage('✅ Success! Your file is ready to be shared.');
      } else {
        setMessage('✅ Success! Link and OTP sent to the recipient\'s email.');
      }
    } catch (err) {
      console.error(err);
      setMessage(`Upload failed: ${err.response?.data?.message || err.message}`);
    } finally {
        setIsUploading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: 'auto' }}>
      <h2>Secure File Upload</h2>
      <input type="file" onChange={(e) => setFile(e.target.files[0])} disabled={isUploading} /><br /><br />
      <input type="number" placeholder="Expiry in hours" value={expiresInHours} onChange={(e) => setExpiresInHours(e.target.value)} disabled={isUploading} /><br /><br />
      <input type="number" placeholder="Max downloads" value={maxDownloads} onChange={(e) => setMaxDownloads(e.target.value)} disabled={isUploading} /><br /><br />
      <input type="email" placeholder="Recipient Email (optional)" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} disabled={isUploading} /><br /><br />
      <button onClick={handleUpload} disabled={!file || isUploading}>
        {isUploading ? 'Processing...' : 'Upload & Share'}
      </button>

      <p style={{ fontWeight: 'bold' }}>{message}</p>

      {fullDownloadLink && (
        <div style={{ marginTop: '2rem', borderTop: '1px solid #ccc', paddingTop: '1rem', background: '#f5f5f5', padding: '1rem' }}>
          <h3>Share these details with the recipient:</h3>
          <p>
            <strong>Download Link:</strong> <a href={fullDownloadLink} target="_blank" rel="noopener noreferrer">{fullDownloadLink}</a>
          </p>
          <p>
            <strong>One-Time Password (OTP):</strong> <strong style={{color: 'blue', fontSize: '1.2em'}}>{otp}</strong>
          </p>
          {qr && <img src={qr} alt="QR Code for download link" />}
        </div>
      )}
    </div>
  );
}

export default Upload;