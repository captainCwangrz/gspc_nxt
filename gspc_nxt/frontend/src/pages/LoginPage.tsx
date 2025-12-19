import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AVATAR_OPTIONS } from '../lib/constants';
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
      <div className="login-hero">
        <h1>Gossip Chain</h1>
        <p>
          Enter the next-gen gossip network. Build constellations, see live activity,
          and keep your inner circle in sync.
        </p>
        <ul>
          <li>Real-time relationship graph updates</li>
          <li>Direct messages with read receipts</li>
          <li>Unified requests + notifications hub</li>
        </ul>
      </div>
      <div className="login-card">
        <form className="card" onSubmit={handleSubmit}>
          <div className="card-header">
            <h2>Sign In</h2>
            <p>Welcome back. Stay connected.</p>
          </div>
          <label>
            Username
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Enter username"
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter password"
              required
            />
          </label>
          <button type="submit">Login</button>
        </form>
        <div className="divider">OR</div>
        <form className="card" onSubmit={handleRegister}>
          <div className="card-header">
            <h2>Register</h2>
            <p>Join the constellation. Create your profile.</p>
          </div>
          <label>
            Real Name
            <input
              value={registerData.realName}
              onChange={(event) =>
                setRegisterData((prev) => ({ ...prev, realName: event.target.value }))
              }
              placeholder="Enter your real name"
              required
            />
          </label>
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
              placeholder="Choose a username"
              required
            />
          </label>
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
                  <img src={`assets/${avatar}`} alt={`Avatar ${avatar}`} />
                </button>
              ))}
            </div>
          </div>
          <button type="submit" className="secondary">
            Create Account
          </button>
        </form>
        {error ? <p className="form-message error">{error}</p> : null}
        {success ? <p className="form-message success">{success}</p> : null}
      </div>
    </div>
  );
};
