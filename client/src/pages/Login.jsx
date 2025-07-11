import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', {
        email,
        password
      });

      localStorage.setItem('token', res.data.token);
      navigate('/upload');
    } catch (err) {
      alert('Invalid login');
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Login to Secure File App</h2>
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" /><br /><br />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" /><br /><br />
      <button onClick={handleLogin}>Login</button>
    </div>
  );
}

export default Login;
