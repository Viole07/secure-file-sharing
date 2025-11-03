import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(''); // State for login errors
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault(); // Prevent form submission
    setError(''); // Clear previous errors

    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', {
        email,
        password
      });

      localStorage.setItem('token', res.data.token);
      navigate('/'); // Navigate to Dashboard on successful login
    } catch (err) {
      setError('Invalid email or password. Please try again.');
      console.error('Login failed:', err);
    }
  };

  return (
    <div className="login-container">
      <div className="card">
        <h2>Login to SecureFile</h2>
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input 
              type="email" 
              id="email"
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="you@example.com" 
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input 
              type="password" 
              id="password"
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="••••••••" 
              required
            />
          </div>
          {error && <p className="message error">{error}</p>}
          <button type="submit" style={{ width: '100%' }}>Login</button>
        </form>
        {/* Add a link to register page if you have one */}
        {/* <p style={{ textAlign: 'center', marginTop: '1rem' }}>
          Don't have an account? <a href="/register">Sign Up</a>
        </p> */}
      </div>
    </div>
  );
}

export default Login;
