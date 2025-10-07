// client/src/pages/Download.jsx
import { useParams } from 'react-router-dom';
import { useState } from 'react';
import axios from 'axios';
import { decryptFileData } from '../aesUtils'; // <-- Import the decrypt function

function Download() {
  const { uuid } = useParams();
  const [otp, setOtp] = useState('');
  const [message, setMessage] = useState('Please enter the OTP to verify your download.');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerifyAndDownload = async () => {
    if (!otp) {
      return setMessage('❌ OTP cannot be empty.');
    }
    setIsVerifying(true);
    setMessage('Verifying OTP and fetching file...');

    try {
      const token = localStorage.getItem("token");

      // 1. Verify OTP and get encrypted file info
      const res = await axios.post(
        `http://localhost:5000/api/files/verify-download/${uuid}`,
        { otp },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const { encryptedFile, filename, fileType } = res.data;

      setMessage('Downloading and decrypting file... Please wait.');

      // 2. Download the encrypted file blob from Cloudinary
      const response = await axios.get(encryptedFile, { responseType: 'blob' });
      const encryptedBlob = response.data;

      // 3. Decrypt the blob using the OTP
      const decryptedBlob = await decryptFileData(encryptedBlob, otp, fileType);

      // 4. Create a temporary link and trigger the download
      const downloadLink = document.createElement('a');
      downloadLink.href = URL.createObjectURL(decryptedBlob);
      downloadLink.download = filename; // Use the original filename
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      setMessage('✅ Download successful!');

    } catch (err) {
      console.error(err);
      setMessage(`❌ Error: ${err.response?.data?.message || 'Invalid OTP or expired link'}`);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div style={{ padding: '2rem', textAlign: 'center', maxWidth: '500px', margin: 'auto' }}>
      <h2>Secure File Download</h2>
      <p>A file has been shared with you securely. Please enter the One-Time Password you received to download it.</p>
      
      <input
        type="text"
        placeholder="Enter 6-digit OTP"
        value={otp}
        onChange={(e) => setOtp(e.target.value)}
        style={{ padding: '0.5rem', marginRight: '0.5rem', width: '200px' }}
        disabled={isVerifying}
      />
      <button onClick={handleVerifyAndDownload} disabled={isVerifying}>
        {isVerifying ? 'Processing...' : 'Verify & Download'}
      </button>

      <p style={{ marginTop: '1rem', fontWeight: 'bold' }}>{message}</p>
    </div>
  );
}

export default Download;