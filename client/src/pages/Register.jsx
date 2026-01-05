import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { generateIdentityKeys } from '../cryptoUtils';
import CryptoJS from 'crypto-js'; // Use for password-based wrapping

function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsRegistering(true);
    setStatus('Generating secure identity...');

    try {
      // 1. Generate local ECC keys
      const { publicKey, privateKey } = await generateIdentityKeys();

      // 2. Wrap (Encrypt) the Private Key using the password
      // This allows the user to "recover" their identity on other devices
      const salt = CryptoJS.lib.WordArray.random(128 / 8).toString();
      const encryptionKey = CryptoJS.PBKDF2(password, salt, { 
        keySize: 256 / 32, 
        iterations: 100000 // Higher iterations for security [cite: 17]
      }).toString();
      
      const wrappedPrivateKey = CryptoJS.AES.encrypt(privateKey, encryptionKey).toString();

      // 3. Send Public Key AND the Wrapped Private Key to the server
      await axios.post('http://localhost:5000/api/auth/register', {
        email,
        password, // Sent for standard auth
        publicKey,
        wrappedPrivateKey,
        keySalt: salt
      });

      // 4. Save locally for immediate use
      localStorage.setItem(`keys_${email}`, JSON.stringify({ publicKey, privateKey }));

      setStatus('✅ Identity secured and backed up!');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setStatus('❌ Error: ' + (err.response?.data?.message || 'Registration failed'));
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="login-container">
      <div className="card">
        <h2>Create Portable Identity</h2>
        <form onSubmit={handleRegister}>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Master Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <small>Used to encrypt your identity keys locally.</small>
          </div>
          <button type="submit" disabled={isRegistering}>Register</button>
        </form>
        {status && <p className="message">{status}</p>}
      </div>
    </div>
  );
}

export default Register;