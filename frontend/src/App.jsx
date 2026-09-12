import { useState, lazy, Suspense } from 'react'
import './App.css'
const Dashboard = lazy(() => import('./Dashboard'))

function getAuthHeader() {
    const token = localStorage.getItem('auth')
    return token ? `Basic ${token}` : null
}

function App() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [name, setName] = useState('')
    const [startingBalance, setStartingBalance] = useState('')
    const [isRegistering, setIsRegistering] = useState(false)
    const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('auth'))
    const [userData, setUserData] = useState(() => {
        const saved = localStorage.getItem('user')
        return saved ? JSON.parse(saved) : null
    })

    const handleLogout = () => {
        localStorage.removeItem('auth')
        localStorage.removeItem('user')
        setUserData(null)
        setIsLoggedIn(false)
    }

    const handleRegister = async (e) => {
        e.preventDefault()
        try {
            const newUser = { name, email, password }
            if (startingBalance !== '') {
                const v = parseFloat(startingBalance)
                if (!isNaN(v) && v >= 0) newUser.startingBalance = v
            }
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newUser),
            })
            if (!res.ok) {
                const err = await res.json().catch(() => ({}))
                throw new Error(err.message || err.error || 'Could not create account')
            }
            alert('Account created successfully. Please log in.')
            setIsRegistering(false)
        } catch (error) {
            alert(error.message || 'Could not create account')
        }
    }

    const handleLogin = async (e) => {
        e.preventDefault()
        try {
            const token = btoa(`${email}:${password}`)
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { Authorization: `Basic ${token}` },
            })
            if (!res.ok) {
                const err = await res.json().catch(() => ({}))
                throw new Error(err.message || err.error || 'Invalid credentials')
            }
            const data = await res.json()
            localStorage.setItem('auth', token)
            localStorage.setItem('user', JSON.stringify(data))
            setUserData(data)
            setIsLoggedIn(true)
        } catch (error) {
            alert(error.message || 'Invalid credentials or connection error')
        }
    }

    // restore session on reload: if has auth but no userData, fetch me
    if (isLoggedIn && !userData) {
        fetch('/api/auth/me', { headers: { Authorization: getAuthHeader() } })
            .then(r => r.ok ? r.json() : null)
            .then(u => { if (u) setUserData(u); else handleLogout() })
            .catch(() => handleLogout())
    }

    if (isLoggedIn && userData) return <Suspense fallback={<div className="auth-container"><p style={{ color: '#fff' }}>LOADING...</p></div>}><Dashboard user={userData} onLogout={handleLogout} /></Suspense>

    return (
        <div className="auth-container">
            <form className="auth-form" onSubmit={isRegistering ? handleRegister : handleLogin}>
                <h1 className="logo-title">EXPENSE.TRACKER</h1>

                {isRegistering && (
                    <>
                        <input type="text" placeholder="NAME" value={name} onChange={(e) => setName(e.target.value)} required />
                        <input type="number" placeholder="SALDO INICIAL (opcional, ej 1000)" value={startingBalance} onChange={(e) => setStartingBalance(e.target.value)} min="0" step="0.01" />
                    </>
                )}

                <input type="email" placeholder="EMAIL" value={email} onChange={(e) => setEmail(e.target.value)} required />
                <input type="password" placeholder="PASSWORD" value={password} onChange={(e) => setPassword(e.target.value)} required />

                <button type="submit">{isRegistering ? 'CREATE ACCOUNT' : 'ENTER'}</button>

                <p className="toggle-auth" onClick={() => setIsRegistering(!isRegistering)}>
                    {isRegistering ? 'Already have an account? Login' : 'New here? Register'}
                </p>
            </form>
        </div>
    )
}

export default App
