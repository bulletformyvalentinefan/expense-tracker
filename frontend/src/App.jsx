import { useState } from 'react'
import axios from 'axios'
import Dashboard from './Dashboard'
import './App.css'

function App() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [name, setName] = useState('')
    const [isRegistering, setIsRegistering] = useState(false)
    const [isLoggedIn, setIsLoggedIn] = useState(false)
    const [userData, setUserData] = useState(null)

    const handleRegister = async (e) => {
        e.preventDefault();
        try {
            const newUser = { name, email, password };
            await axios.post('/api/auth/register', newUser);
            setIsRegistering(false);
        } catch (error) {
            console.error("Registration error:", error);
            alert("Could not create account");
        }
    }

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const authConfig = {
                auth: {
                    username: email,
                    password: password
                }
            };

            const response = await axios.post('/api/auth/login', {}, authConfig);
            axios.defaults.auth = authConfig.auth;
            setUserData(response.data);
            setIsLoggedIn(true);
        } catch (error) {
            console.error("Login error:", error);
            alert("Invalid credentials or connection error");
        }
    }

    if (isLoggedIn) return <Dashboard user={userData} />;

    return (
        <div className="auth-container">
            <form className="auth-form" onSubmit={isRegistering ? handleRegister : handleLogin}>
                <h1 className="logo-title">EXPENSE.TRACKER</h1>

                {isRegistering && (
                    <input
                        type="text"
                        placeholder="NAME"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />
                )}

                <input
                    type="email"
                    placeholder="EMAIL"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />

                <input
                    type="password"
                    placeholder="PASSWORD"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />

                <button type="submit">{isRegistering ? 'CREATE ACCOUNT' : 'ENTER'}</button>

                <p className="toggle-auth" onClick={() => setIsRegistering(!isRegistering)}>
                    {isRegistering ? 'Already have an account? Login' : 'New here? Register'}
                </p>
            </form>
        </div>
    )
}

export default App