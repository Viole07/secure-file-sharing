// client/src/pages/Upload.jsx
import { useState } from 'react';
import axios from 'axios';
import { encryptFileData } from '../aesUtils';
import Navbar from '../components/Navbar'; // Import Navbar

function Upload() {
  const [file, setFile] = useState(null);
  const [expiresInHours, setExpiresInHours] = useState(24);
  const [maxDownloads, setMaxDownloads] = useState(3);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [qr, setQr] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info'); // info, success, error
  const [isUploading, setIsUploading] = useState(false);
  const [fullDownloadLink, setFullDownloadLink] = useState('');

  const token = localStorage.getItem('token');

  const handleUpload = async () => {
    if (!file) {
      setMessage('Please select a file.');
      setMessageType('error');
      return;
    }
    setIsUploading(true);
    setFullDownloadLink('');
    setMessage('Generating OTP and encrypting file...');
    setMessageType('info');

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
        const link = `${window.location.origin}/download/${saveRes.data.uuid}`;
        setFullDownloadLink(link);
        setOtp(saveRes.data.otp);
        setQr(saveRes.data.qr);
        setMessage('✅ Success! Your file is ready to be shared.');
        setMessageType('success');
      } else {
        setMessage('✅ Success! Link and OTP sent to the recipient\'s email.');
        setMessageType('success');
      }
    } catch (err) {
      console.error(err);
      setMessage(`Upload failed: ${err.response?.data?.message || err.message}`);
      setMessageType('error');
    } finally {
        setIsUploading(false);
    }
  };

  const messageClass = `message ${messageType}`;

  return (
    <>
      <Navbar />
      <div className="page-container">
        <div className="card">
          <h2>Secure File Upload</h2>
          <div className="form-group">
            <label htmlFor="file-upload">1. Select your file</label>
            <input id="file-upload" type="file" onChange={(e) => setFile(e.target.files[0])} disabled={isUploading} />
          </div>

          <div className="form-group">
            <label htmlFor="expiry">2. Set expiry (in hours)</label>
            <input id="expiry" type="number" placeholder="Expiry in hours" value={expiresInHours} onChange={(e) => setExpiresInHours(e.target.value)} disabled={isUploading} />
          </div>

          <div className="form-group">
            <label htmlFor="max-downloads">3. Set max downloads</label>
            <input id="max-downloads" type="number" placeholder="Max downloads" value={maxDownloads} onChange={(e) => setMaxDownloads(e.target.value)} disabled={isUploading} />
          </div>

          <div className="form-group">
            <label htmlFor="recipient-email">4. Send to email (optional)</label>
            <input id="recipient-email" type="email" placeholder="Recipient Email (optional)" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} disabled={isUploading} />
          </div>

          <button onClick={handleUpload} disabled={!file || isUploading} style={{ width: '100%' }}>
            {isUploading ? 'Processing...' : 'Upload & Share'}
          </button>

          {message && <p className={messageClass}>{message}</p>}

          {fullDownloadLink && (
            <div className="share-details">
              <h3>Share these details with the recipient:</h3>
              <p>
                <strong>Download Link:</strong> <a href={fullDownloadLink} target="_blank" rel="noopener noreferrer">{fullDownloadLink}</a>
              </p>
              <p>
                <strong>One-Time Password (OTP):</strong> <strong className="otp-display">{otp}</strong>
              </p>
              {qr && <img src={qr} alt="QR Code for download link" />}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default Upload;
