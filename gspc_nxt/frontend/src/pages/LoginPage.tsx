import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AVATAR_OPTIONS } from '../lib/constants';
import { resolveAssetUrl } from '../lib/assets';
import { useUserStore } from '../stores/useUserStore';

export const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [registerData, setRegisterData] = useState({
    realName: '',
    dob: '',
    username: '',
    password: '',
    confirmPassword: '',
    avatar: AVATAR_OPTIONS[0],
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const login = useUserStore((state) => state.login);
  const register = useUserStore((state) => state.register);
  const navigate = useNavigate();

  const passwordChecks = [
    {
      label: 'At least 8 characters',
      valid: registerData.password.length >= 8,
    },
    {
      label: 'One uppercase letter',
      valid: /[A-Z]/.test(registerData.password),
    },
    {
      label: 'One number',
      valid: /\d/.test(registerData.password),
    },
    {
      label: 'Passwords match',
      valid:
        registerData.password.length > 0 &&
        registerData.password === registerData.confirmPassword,
    },
  ];

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err) {
      setError('Unable to sign in. Double-check your credentials.');
    }
  };

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      await register(registerData);
      setSuccess('Account created! You can sign in now.');
      setRegisterData({
        realName: '',
        dob: '',
        username: '',
        password: '',
        confirmPassword: '',
        avatar: AVATAR_OPTIONS[0],
      });
    } catch (err) {
      setError('Registration failed. Check the fields and try again.');
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <header className="login-header">
          <h1>Gossip Chain</h1>
          <p>Sign in or create an account to enter the constellation.</p>
        </header>
        <div className="login-stack">
          <form className="card glass-card" onSubmit={handleSubmit}>
            <div className="card-header">
              <h2>Sign In</h2>
              <p>Welcome back.</p>
            </div>
            <label>
              Username
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Username"
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Password"
                required
              />
            </label>
            <button type="submit">Sign In</button>
          </form>
          <form className="card glass-card" onSubmit={handleRegister}>
            <div className="card-header">
              <h2>Create Account</h2>
              <p>Quick setup and you are in.</p>
            </div>
            <label>
              Real Name
              <input
                value={registerData.realName}
                onChange={(event) =>
                  setRegisterData((prev) => ({ ...prev, realName: event.target.value }))
                }
                placeholder="Your name"
                required
              />
            </label>
            <div className="login-row">
              <label>
                Date of Birth
                <input
                  type="date"
                  value={registerData.dob}
                  onChange={(event) =>
                    setRegisterData((prev) => ({ ...prev, dob: event.target.value }))
                  }
                  required
                />
              </label>
              <label>
                Username
                <input
                  value={registerData.username}
                  onChange={(event) =>
                    setRegisterData((prev) => ({ ...prev, username: event.target.value }))
                  }
                  placeholder="Handle"
                  required
                />
              </label>
            </div>
            <label>
              Password
              <input
                type="password"
                value={registerData.password}
                onChange={(event) =>
                  setRegisterData((prev) => ({ ...prev, password: event.target.value }))
                }
                placeholder="Create a password"
                required
              />
            </label>
            <label>
              Confirm Password
              <input
                type="password"
                value={registerData.confirmPassword}
                onChange={(event) =>
                  setRegisterData((prev) => ({ ...prev, confirmPassword: event.target.value }))
                }
                placeholder="Confirm your password"
                required
              />
            </label>
            <div className="password-checklist compact">
              <ul>
                {passwordChecks.map((item) => (
                  <li key={item.label} className={item.valid ? 'valid' : 'invalid'}>
                    <span>{item.valid ? '✓' : '•'}</span>
                    {item.label}
                  </li>
                ))}
              </ul>
            </div>
            <div className="avatar-select">
              <span>Select Avatar</span>
              <div className="avatar-options">
                {AVATAR_OPTIONS.map((avatar) => (
                  <button
                    key={avatar}
                    type="button"
                    className={
                      registerData.avatar === avatar ? 'avatar active' : 'avatar'
                    }
                    onClick={() =>
                      setRegisterData((prev) => ({ ...prev, avatar }))
                    }
                  >
                    <img
                      src={resolveAssetUrl(`assets/${avatar}`)}
                      alt={`Avatar ${avatar}`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <button type="submit" className="secondary">
              Create Account
            </button>
          </form>
        </div>
        {error ? <p className="form-message error">{error}</p> : null}
        {success ? <p className="form-message success">{success}</p> : null}
      </div>
    </div>
  );
};
