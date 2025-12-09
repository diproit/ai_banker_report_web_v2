import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaUser, FaLock } from "react-icons/fa";
import { ToastContainer, toast } from "react-toastify";
import { useAuth } from "../../contexts/AuthContext";
import "react-toastify/dist/ReactToastify.css";
import "../css/Login.css";

const Login = () => {
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const validateForm = () => {
    if (!userName) {
      toast.error("Please enter your username");
      return false;
    }
    if (!password) {
      toast.error("Please enter your password");
      return false;
    }
    if (userName.length < 2) {
      toast.error("Username must be at least 2 characters long");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const result = await login(userName, password);

      if (result.success) {
        toast.success("Login successful! Redirecting...");
        navigate("/home");
      } else {
        toast.error(result.error || "Login failed");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = (provider) => {
    toast.info(`Redirecting to ${provider} authentication...`);
    // Simulate social login and redirect
    setTimeout(() => {
      navigate("/home");
    }, 1500);
  };

  return (
    <div className="login-container">
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />

      <div className="login-header">
        <h1>AIB-REPORTS</h1>
      </div>

      <div className="login-card">
        <h2>Sign in to your account</h2>
        <p>Enter your username and password</p>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <FaUser className="input-icon" />
            <input
              type="text"
              placeholder="Username"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <FaLock className="input-icon" />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {/* <div className="remember-forgot">
            <label>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={() => setRememberMe(!rememberMe)}
              />
              Remember me
            </label>
            <a href="/forgot-password">Forgot password?</a>
          </div> */}

          <button type="submit" className="login-btn" disabled={isLoading}>
            {isLoading ? (
              <div className="button-loader">
                <div className="spinner"></div>
                <span>Signing in...</span>
              </div>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        {/* <div className="divider">
          <span>or</span>
        </div> */}

        {/* <div className="social-login">
          <button 
            className="social-btn google" 
            onClick={() => handleSocialLogin('Google')}
          >
            <FcGoogle className="social-icon" />
            Continue with Google
          </button>
          <button 
            className="social-btn facebook"
            onClick={() => handleSocialLogin('Facebook')}
          >
            <BsFacebook className="social-icon" />
            Continue with Facebook
          </button>
        </div> */}

        {/* <div className="signup-link">
          Don't have an account? <a href="/signup">Sign up</a>
        </div> */}
      </div>

      <div className="login-footer">
        <p>
          © {new Date().getFullYear()} 2006-2025 Rajida Holdings (Pvt) Ltd. All
          Rights Reserved.
        </p>
        <div className="footer-links">
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href="/security">Security</a>
        </div>
      </div>
    </div>
  );
};

export default Login;
