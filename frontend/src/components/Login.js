import React, { useState } from 'react';
import './Login.css';

function Login({ onLogin }) {
    const [name, setName] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (name.trim()) {
            onLogin(name.trim());
        }
    };

    const handleGuestLogin = () => {
        onLogin('Guest_' + Math.floor(Math.random() * 1000));
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <h2>Welcome Back</h2>
                <p>Login to start chatting</p>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <input
                            type="text"
                            placeholder="Enter your name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit" className="login-btn">
                        Login
                    </button>
                </form>

                <div className="divider">or</div>

                <button className="guest-btn" onClick={handleGuestLogin}>
                    Quick Guest Login
                </button>
            </div>
        </div>
    );
}

export default Login;
