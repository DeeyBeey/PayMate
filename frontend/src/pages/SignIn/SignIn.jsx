import {useState, useEffect} from 'react'
import { Link, useNavigate, useLocation} from 'react-router-dom';
import './SignIn.css'
import OAuth from '../../components/OAuth'
import {useDispatch, useSelector} from 'react-redux'
import { signInStart, signInSuccess, signInFailure, clearError } from '../../redux/user/userSlice';

export default function SignIn() {
  const [formData, setFormData] = useState({});
  const { loading, error } = useSelector((state) => state.user);
  const location = useLocation();
  const successMessage = location.state?.successMessage || null;
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const handleChange = (e) => {
    setFormData({ 
      ...formData,
      [e.target.id]: e.target.value,
    });
  };
  
  useEffect(() => {
    dispatch(clearError());
  }, [dispatch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try{
      dispatch(signInStart());
      const res = await fetch('/server/auth/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      console.log(data);
      if (data.success === false) {
        dispatch(signInFailure(data.message));
        return;
      }
      dispatch(signInSuccess(data));
      navigate('/scan-receipt');
    } catch (err) {
      dispatch(signInFailure(err.message));
    }
  };

  return (
    <div className="signin-container">
      <h2>Sign In</h2>
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
          type="password"
          placeholder="Password"
          id="password"
          value={formData.password}
          onChange={handleChange}
          required
        />
        <button disabled={loading}>
          {loading ? 'Loading...' : 'Sign In'}
        </button>
        <OAuth />
      </form>
      <div className="flex">
        <p>Dont have an account?</p>
        <Link to="/sign-up">
          <span>Sign up</span>
        </Link>
      </div>
      {error && <p className="text-red-500">{error}</p>}
      {successMessage && <p className="text-green-600 text-center mb-2">{successMessage}</p>}
    </div>
  );
    
}
