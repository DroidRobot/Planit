import React, { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 8);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    navigate('/login');
  };

  if (!user) return null;

  const initials = user.fullName
    ?.split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <Link to="/" className="navbar-brand">Planit</Link>
      <div className="navbar-links">
        <NavLink to="/" end>Dashboard</NavLink>
        <NavLink to="/plans">Plans</NavLink>
        <NavLink to="/reminders">Reminders</NavLink>
      </div>
      <div className="profile-menu" ref={menuRef}>
        <button className="profile-trigger" onClick={() => setOpen(!open)}>
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.fullName}
              className="navbar-avatar"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="navbar-avatar-initials">{initials}</div>
          )}
          <span className="profile-name">{user.fullName}</span>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ opacity: 0.6, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0)', color: '#64748b' }}>
            <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {open && (
          <div className="profile-dropdown">
            <div className="profile-dropdown-header">
              <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{user.fullName}</div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{user.email}</div>
            </div>
            <div className="profile-dropdown-divider" />
            <button
              className="profile-dropdown-item"
              onClick={() => { setOpen(false); navigate('/profile'); }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.3" />
                <path d="M3 14c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              Profile
            </button>
            <button className="profile-dropdown-item profile-dropdown-logout" onClick={handleLogout}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 2H4a2 2 0 00-2 2v8a2 2 0 002 2h2M10.5 11.5L14 8l-3.5-3.5M14 8H6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Log out
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
