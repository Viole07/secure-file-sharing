import { useState } from 'react';
import axios from 'axios';
import { encryptFileECC } from '../cryptoUtils';
import Navbar from '../components/Navbar';

function Upload() {
  const [file, setFile] = useState(null);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [expiresInHours, setExpiresInHours] = useState(24);
  const [maxDownloads, setMaxDownloads] = useState(3);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [downloadLink, setDownloadLink] = useState('');

  const token = localStorage.getItem('token');

  const handleUpload = async () => {
    if (!file || !recipientEmail) return setMessage("File and recipient email are required.");
    
    setIsUploading(true);
    setMessage("Searching for recipient's identity...");

    try {
      const { data: recipientData } = await axios.get(
        `http://localhost:5000/api/files/recipient-key/${recipientEmail}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMessage("Encrypting file browser-side (AES-256-GCM)...");
      const { ciphertext, iv, senderEphemeralPublicKey } = await encryptFileECC(file, recipientData.publicKey);

      const { data: uploadParams } = await axios.get(
        'http://localhost:5000/api/files/upload-url',
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const formData = new FormData();
      formData.append('file', new Blob([ciphertext]));
      formData.append('timestamp', uploadParams.timestamp);
      formData.append('api_key', uploadParams.apiKey);
      formData.append('signature', uploadParams.signature);
      formData.append('folder', uploadParams.folder);

      setMessage("Uploading encrypted blob...");
      const cloudRes = await axios.post(
        `https://api.cloudinary.com/v1_1/${uploadParams.cloudName}/raw/upload`,
        formData
      );

      setMessage("Finalizing policy settings...");
      const saveRes = await axios.post(
        'http://localhost:5000/api/files/save',
        {
          filename: file.name,
          fileType: file.type,
          cloudinaryUrl: cloudRes.data.secure_url,
          cloudinaryPublicId: cloudRes.data.public_id,
          expiresInHours,
          maxDownloads,
          recipientPublicKey: recipientData.publicKey,
          senderEphemeralPublicKey,
          iv
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setDownloadLink(saveRes.data.downloadLink);
      setMessage("✅ Shredding policy active. Secure link generated!");
    } catch (err) {
      setMessage("Error: " + (err.response?.data?.message || "Upload failed."));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="page-container">
        <div className="card">
          <h2>Zero-Knowledge Secure Share</h2>
          <div className="form-group">
            <label>Select File</label>
            <input type="file" onChange={(e) => setFile(e.target.files[0])} disabled={isUploading} />
          </div>
          <div className="form-group">
            <label>Recipient Email</label>
            <input type="email" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} disabled={isUploading} />
          </div>
          <div className="form-group" style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1 }}>
              <label>Expiry (Hours)</label>
              <input type="number" value={expiresInHours} onChange={(e) => setExpiresInHours(e.target.value)} disabled={isUploading} />
            </div>
            <div style={{ flex: 1 }}>
              <label>Max Downloads</label>
              <input type="number" value={maxDownloads} onChange={(e) => setMaxDownloads(e.target.value)} disabled={isUploading} />
            </div>
          </div>
          <button onClick={handleUpload} disabled={isUploading} style={{ width: '100%' }}>
            {isUploading ? "Protecting Data..." : "Encrypt & Upload"}
          </button>
          <p className="message">{message}</p>
          {downloadLink && (
            <div className="share-details">
              <strong>Share Link:</strong> <a href={downloadLink}>{downloadLink}</a>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default Upload;