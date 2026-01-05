import { useState } from 'react';
import axios from 'axios';
import { encryptFileECC } from '../cryptoUtils';
import Navbar from '../components/Navbar';

function Upload() {
  const [file, setFile] = useState(null);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [downloadLink, setDownloadLink] = useState('');

  const token = localStorage.getItem('token');

  const handleUpload = async () => {
    if (!file || !recipientEmail) return setMessage("File and recipient email are required.");
    
    setIsUploading(true);
    setMessage("Searching for recipient's identity...");

    try {
      // 1. Fetch Recipient's Public Key
      const { data: recipientData } = await axios.get(
        `http://localhost:5000/api/files/recipient-key/${recipientEmail}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMessage("Encrypting file with ECC + AES-GCM...");
      // 2. Perform Browser-Side Encryption
      const { ciphertext, iv, senderEphemeralPublicKey } = await encryptFileECC(file, recipientData.publicKey);

      // 3. Get Signed Cloudinary URL
      const { data: uploadParams } = await axios.get(
        'http://localhost:5000/api/files/upload-url',
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // 4. Upload Encrypted Blob
      const formData = new FormData();
      formData.append('file', new Blob([ciphertext]));
      formData.append('timestamp', uploadParams.timestamp);
      formData.append('api_key', uploadParams.apiKey);
      formData.append('signature', uploadParams.signature);
      formData.append('folder', uploadParams.folder);

      const cloudRes = await axios.post(
        `https://api.cloudinary.com/v1_1/${uploadParams.cloudName}/raw/upload`,
        formData
      );

      // 5. Save Metadata (Metadata is the "Shredding" path)
      const saveRes = await axios.post(
        'http://localhost:5000/api/files/save',
        {
          filename: file.name,
          fileType: file.type,
          cloudinaryUrl: cloudRes.data.secure_url,
          cloudinaryPublicId: cloudRes.data.public_id,
          expiresInHours: 24,
          maxDownloads: 5,
          recipientPublicKey: recipientData.publicKey,
          senderEphemeralPublicKey,
          iv
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setDownloadLink(saveRes.data.downloadLink);
      setMessage("✅ Secure link generated! No OTP needed.");
    } catch (err) {
      console.error(err);
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
          <h2>Zero-Knowledge Upload</h2>
          <input type="file" onChange={(e) => setFile(e.target.files[0])} disabled={isUploading} />
          <input 
            type="email" 
            placeholder="Recipient Email" 
            value={recipientEmail} 
            onChange={(e) => setRecipientEmail(e.target.value)} 
            disabled={isUploading} 
          />
          <button onClick={handleUpload} disabled={isUploading}>
            {isUploading ? "Processing..." : "Encrypt & Send"}
          </button>
          <p className="message">{message}</p>
          {downloadLink && <p><strong>Share this link:</strong> {downloadLink}</p>}
        </div>
      </div>
    </>
  );
}

export default Upload;