import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">Planit</Link>
      <div className="navbar-links">
        <NavLink to="/" end>Dashboard</NavLink>
        <NavLink to="/plans">Plans</NavLink>
        <NavLink to="/reminders">Reminders</NavLink>
      </div>
      <div className="navbar-user">
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.fullName}
            className="navbar-avatar"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="navbar-avatar-initials">
            {user.fullName?.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
          </div>
        )}
        <span>{user.fullName}</span>
        <button
          className="btn btn-sm btn-outline"
          style={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}
          onClick={handleLogout}
        >
          Log out
        </button>
      </div>
    </nav>
  );
}

export default Navbar;
