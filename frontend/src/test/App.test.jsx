import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'

describe('App auth flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    vi.stubGlobal('fetch', vi.fn((url, _opts) => {
      const u = String(url)
      if (u.includes('/api/auth/login')) {
        return Promise.resolve({ ok: true, headers: { get: () => 'application/json' }, json: () => Promise.resolve({ id: '1', name: 'bob', email: 'bob@test.com', startingBalance: 0 }) })
      }
      if (u.includes('/api/auth/register')) {
        return Promise.resolve({ ok: true, headers: { get: () => 'application/json' }, json: () => Promise.resolve({}) })
      }
      if (u.includes('/balance')) {
        return Promise.resolve({ ok: true, headers: { get: () => 'application/json' }, json: () => Promise.resolve({ startingBalance: 0, totalSpent: 0, currentBalance: 0 }) })
      }
      if (u.includes('/summary/categories')) {
        return Promise.resolve({ ok: true, headers: { get: () => 'application/json' }, json: () => Promise.resolve([]) })
      }
      if (u.includes('/api/categories') || u.includes('/api/expenses') || u.includes('/api/users')) {
        return Promise.resolve({ ok: true, headers: { get: () => 'application/json' }, json: () => Promise.resolve([]) })
      }
      return Promise.resolve({ ok: true, headers: { get: () => 'application/json' }, json: () => Promise.resolve([]) })
    }))
  })

  it('renders login form when not authenticated', async () => {
    render(<App />)
    expect(await screen.findByPlaceholderText(/email/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument()
    expect(screen.getByText('ENTER')).toBeInTheDocument()
  })

  it('toggles to register and shows name field', async () => {
    const user = userEvent.setup()
    render(<App />)
    const toggle = screen.getByText(/New here\? Register/i)
    await user.click(toggle)
    expect(await screen.findByPlaceholderText(/name/i)).toBeInTheDocument()
    expect(screen.getByText('CREATE ACCOUNT')).toBeInTheDocument()
  })

  it('shows dashboard after login', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.type(screen.getByPlaceholderText(/email/i), 'bob@test.com')
    await user.type(screen.getByPlaceholderText(/password/i), '123456')
    await user.click(screen.getByText('ENTER'))
    // Dashboard should appear (Dashboard renders user greeting)
    expect(await screen.findByText(/EXPENSE/i)).toBeInTheDocument()
  })
})
