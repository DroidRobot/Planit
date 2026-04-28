import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateProfile } from '../services/api';

function Profile() {
  const { user, login } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileMsg, setProfileMsg] = useState('');
  const [profileError, setProfileError] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const hasPassword = user?.hasPassword !== false;

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileMsg('');
    setProfileError('');
    if (!fullName.trim()) {
      setProfileError('Name is required');
      return;
    }
    setSavingProfile(true);
    try {
      const res = await updateProfile({ fullName: fullName.trim(), phoneNumber: phoneNumber.trim() || null });
      setProfileMsg('Profile updated');
      window.location.reload();
    } catch (err) {
      setProfileError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    setPasswordMsg('');
    setPasswordError('');
    if (!currentPassword) {
      setPasswordError('Current password is required');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    setSavingPassword(true);
    try {
      await updateProfile({ currentPassword, newPassword });
      setPasswordMsg('Password updated');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(err.response?.data?.error || 'Failed to update password');
    } finally {
      setSavingPassword(false);
    }
  };

  const initials = user?.fullName
    ?.split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      <h1 style={{ marginBottom: '1.5rem' }}>Profile</h1>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.fullName}
              style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '2px solid #e2e8f0' }}
              referrerPolicy="no-referrer"
            />
          ) : (
            <div style={{
              width: 56, height: 56, borderRadius: '50%', background: '#4f46e5',
              color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.1rem', fontWeight: 700,
            }}>
              {initials}
            </div>
          )}
          <div>
            <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{user?.fullName}</div>
            <div style={{ color: '#64748b', fontSize: '0.875rem' }}>{user?.email}</div>
          </div>
        </div>

        {profileMsg && <div style={{ marginBottom: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: 6, background: '#d1fae5', color: '#065f46', fontSize: '0.875rem' }}>{profileMsg}</div>}
        {profileError && <div className="error-msg" style={{ marginBottom: '0.75rem' }}>{profileError}</div>}

        <form onSubmit={handleProfileSave}>
          <div className="form-group">
            <label>Full Name</label>
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Phone Number</label>
            <input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="For SMS reminders" />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={user?.email || ''} disabled style={{ background: '#f8fafc', color: '#94a3b8' }} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={savingProfile}>
            {savingProfile ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>

      {hasPassword && (
        <div className="card">
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Change Password</h2>

          {passwordMsg && <div style={{ marginBottom: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: 6, background: '#d1fae5', color: '#065f46', fontSize: '0.875rem' }}>{passwordMsg}</div>}
          {passwordError && <div className="error-msg" style={{ marginBottom: '0.75rem' }}>{passwordError}</div>}

          <form onSubmit={handlePasswordSave}>
            <div className="form-group">
              <label>Current Password</label>
              <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            </div>
            <div className="form-group">
              <label>New Password</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 6 characters" />
            </div>
            <div className="form-group">
              <label>Confirm New Password</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary" disabled={savingPassword}>
              {savingPassword ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default Profile;
