// client/src/pages/Download.jsx
import { useParams } from 'react-router-dom';
import { useState } from 'react';
import axios from 'axios';
import { decryptFileData } from '../aesUtils';
import Navbar from '../components/Navbar'; // Import Navbar

function Download() {
  const { uuid } = useParams();
  const [otp, setOtp] = useState('');
  const [message, setMessage] = useState('Please enter the OTP to verify your download.');
  const [isVerifying, setIsVerifying] = useState(false);
  const [messageType, setMessageType] = useState('info'); // info, success, error

  const handleVerifyAndDownload = async () => {
    if (!otp) {
      setMessage('❌ OTP cannot be empty.');
      setMessageType('error');
      return;
    }
    setIsVerifying(true);
    setMessage('Verifying OTP and fetching file...');
    setMessageType('info');

    try {
      const token = localStorage.getItem("token");

      const res = await axios.post(
        `http://localhost:5000/api/files/verify-download/${uuid}`,
        { otp },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const { encryptedFile, filename, fileType } = res.data;

      setMessage('Downloading and decrypting file... Please wait.');
      setMessageType('info');

      const response = await axios.get(encryptedFile, { responseType: 'blob' });
      const encryptedBlob = response.data;

      const decryptedBlob = await decryptFileData(encryptedBlob, otp, fileType);

      const downloadLink = document.createElement('a');
      downloadLink.href = URL.createObjectURL(decryptedBlob);
      downloadLink.download = filename;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      setMessage('✅ Download successful!');
      setMessageType('success');

    } catch (err) {
      console.error(err);
      setMessage(`❌ Error: ${err.response?.data?.message || 'Invalid OTP or expired link'}`);
      setMessageType('error');
    } finally {
      setIsVerifying(false);
    }
  };

  // Determine message class based on type
  const messageClass = `message ${messageType}`;

  return (
    <>
      <Navbar />
      <div className="page-container">
        <div className="card" style={{ maxWidth: '550px', margin: 'auto', textAlign: 'center' }}>
          <h2>Secure File Download</h2>
          <p>A file has been shared with you securely. Please enter the One-Time Password you received to download it.</p>
          
          <div className="form-group" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
            <input
              type="text"
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              style={{ width: '200px', textAlign: 'center' }}
              disabled={isVerifying}
            />
            <button onClick={handleVerifyAndDownload} disabled={isVerifying}>
              {isVerifying ? 'Processing...' : 'Verify & Download'}
            </button>
          </div>

          <p className={messageClass}>{message}</p>
        </div>
      </div>
    </>
  );
}

export default Download;
