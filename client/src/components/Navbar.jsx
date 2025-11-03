import { useNavigate, Link } from 'react-router-dom';

export default function Navbar() {
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="nav-content">
        <Link to="/" className="nav-brand">SecureFile</Link>
        <div className="nav-links">
          <Link to="/">Dashboard</Link>
          <Link to="/upload">Upload</Link>
          <button onClick={logout} className="btn-secondary">Logout</button>
        </div>
      </div>
    </nav>
  );
}
