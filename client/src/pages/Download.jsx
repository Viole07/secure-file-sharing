import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { decryptFileECC } from '../cryptoUtils';
import Navbar from '../components/Navbar';

function Download() {
  const { uuid } = useParams();
  const [status, setStatus] = useState('Checking authorization...');
  const token = localStorage.getItem('token');

  const startDownload = async () => {
    try {
      // 1. Fetch File Metadata & Ephemeral Point
      const res = await axios.post(
        `http://localhost:5000/api/files/verify-download/${uuid}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const { encryptedFile, filename, fileType, senderEphemeralPublicKey, iv } = res.data;
      setStatus("Downloading encrypted segment...");

      // 2. Fetch Ciphertext from Cloudinary
      const cloudRes = await axios.get(encryptedFile, { responseType: 'arraybuffer' });
      
      // 3. Retrieve Identity Private Key from session/local storage
      // In this prototype, we assume it was stored during login
      const myEmail = JSON.parse(atob(token.split('.')[1])).email;
      const myKeys = JSON.parse(localStorage.getItem(`keys_${myEmail}`));

      if (!myKeys) throw new Error("Private key not found in this browser.");

      setStatus("Performing ECDH Handshake & Decrypting...");
      const decryptedBuffer = await decryptFileECC(
        cloudRes.data, 
        senderEphemeralPublicKey, 
        myKeys.privateKey, 
        iv
      );

      // 4. Trigger Save
      const blob = new Blob([decryptedBuffer], { type: fileType });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      
      setStatus("✅ Success!");
    } catch (err) {
      console.error(err);
      setStatus("❌ Access Denied: " + (err.response?.data?.message || "Check your credentials."));
    }
  };

  return (
    <>
      <Navbar />
      <div className="page-container">
        <div className="card">
          <h2>Secure Download</h2>
          <p>{status}</p>
          <button onClick={startDownload}>Attempt Decryption</button>
        </div>
      </div>
    </>
  );
}

export default Download;