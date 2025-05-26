import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function VerifyEmail() {
  const [status, setStatus] = useState('Verifying...');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');

    const verify = async () => {
      try {
        const res = await fetch(`http://localhost:5000/server/auth/verify-email?token=${token}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || 'Verification failed.');
        }

        setStatus('Email verified successfully!');
        setTimeout(() => navigate('/sign-in'), 2000);
      } catch (err) {
        setStatus(`${err.message}`);
      }
    };

    if (token) {
      verify();
    } else {
      setStatus('Invalid verification link.');
    }
  }, [searchParams, navigate]);

  return (
    <div className="verify-container" style={{ textAlign: 'center', marginTop: '3rem' }}>
      <h2>{status}</h2>
      {status.includes('success') && <p>Redirecting to login...</p>}
    </div>
  );
}
