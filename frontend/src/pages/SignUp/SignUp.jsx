import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './SignUp.css';
import OAuth from '../../components/OAuth';

export default function SignUp() {
  const [formData, setFormData] = useState({
    email: '',
    confirmEmail: '',
    password: ''
  });
  const [passwordRules, setPasswordRules] = useState({
    length: false,
    number: false,
    special: false,
    });

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
  const { id, value } = e.target;

  setFormData((prev) => ({
    ...prev,
    [id]: value,
  }));

  if (id === "password") {
    setPasswordRules(getPasswordRules(value));
  }
};

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.email !== formData.confirmEmail) {
      setError("Emails do not match.");
      return;
    }
    try {
      setLoading(true);
      const res = await fetch('/server/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setLoading(false);
        setError(data.message || 'Signup failed');
        return;
      }

      setLoading(false);
      navigate('/sign-in');
    } catch (err) {
      setLoading(false);
      setError('An error occurred. Please try again.');
    }
  };

  const getPasswordRules = (password) => ({
  length: password.length >= 8,
  number: /\d/.test(password),
  special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  });


  return (
    <div className="signup-container">
      <h2>Sign Up</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          id="email"
          value={formData.email}
          onChange={handleChange}
          required
        />

        <input
          type="email"
          placeholder="Confirm Email"
          id="confirmEmail"
          value={formData.confirmEmail}
          onChange={handleChange}
          required
        />

        <input
          type="password"
          placeholder="Password"
          id="password"
          value={formData.password}
          onChange={handleChange}
          required
        />

        <div className="password-rules">
          <p style={{ color: passwordRules.length ? 'green' : 'gray' }}>
            • At least 8 characters
          </p>
          <p style={{ color: passwordRules.number ? 'green' : 'gray' }}>
            • Contains a number
          </p>
          <p style={{ color: passwordRules.special ? 'green' : 'gray' }}>
            • Contains a special character
          </p>
        </div>

        <button disabled={loading || Object.values(passwordRules).includes(false)}>
          {loading ? 'Loading...' : 'Sign Up'}
        </button>
        <OAuth />
      </form>
      <div className="flex">
        <p>Have an account?</p>
        <Link to="/sign-in">
          <span>Sign in</span>
        </Link>
      </div>
      {error && <p className="text-red-500">{error}</p>}
    </div>
  );
}