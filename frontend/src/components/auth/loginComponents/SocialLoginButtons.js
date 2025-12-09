import React from 'react';
import { FcGoogle } from 'react-icons/fc';
import { BsFacebook } from 'react-icons/bs';

export default function SocialLoginButtons({ onSocialLogin }) {
    return (
        <div className="social-login">
            <button
                className="social-btn google"
                onClick={() => onSocialLogin('Google')}
            >
                <FcGoogle className="social-icon" />
                Continue with Google
            </button>
            <button
                className="social-btn facebook"
                onClick={() => onSocialLogin('Facebook')}
            >
                <BsFacebook className="social-icon" />
                Continue with Facebook
            </button>
        </div>
    );
}
