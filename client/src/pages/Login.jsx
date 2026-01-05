import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import CryptoJS from 'crypto-js';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', {
        email,
        password
      });

      const { token, publicKey, wrappedPrivateKey, keySalt } = res.data;
      localStorage.setItem('token', token);

      // 1. Check if identity exists in THIS browser
      let localKeys = localStorage.getItem(`keys_${email}`);

      if (!localKeys && wrappedPrivateKey) {
        // 2. NEW BROWSER DETECTED: Sync Identity
        console.log("New browser detected. Restoring secure identity...");
        
        // Re-derive the local encryption key from password + salt
        const encryptionKey = CryptoJS.PBKDF2(password, keySalt, {
          keySize: 256 / 32,
          iterations: 100000 // Must match Register.jsx
        }).toString();

        // Decrypt the private key
        const bytes = CryptoJS.AES.decrypt(wrappedPrivateKey, encryptionKey);
        const decryptedPrivateKey = bytes.toString(CryptoJS.enc.Utf8);

        if (!decryptedPrivateKey) throw new Error("Decryption failed. Wrong password?");

        // Save restored identity locally
        localStorage.setItem(`keys_${email}`, JSON.stringify({
          publicKey,
          privateKey: decryptedPrivateKey
        }));
      }

      navigate('/');
    } catch (err) {
      console.error(err);
      setError('Login failed or identity could not be restored.');
    }
  };

  return (
    <div className="login-container">
      <div className="card">
        <h2>Login & Sync</h2>
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button type="submit">Log In</button>
        </form>
        {error && <p className="message error">{error}</p>}
      </div>
    </div>
  );
}

export default Login;