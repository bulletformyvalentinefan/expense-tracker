import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'

// Mock axios
vi.mock('axios', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: [] }),
    post: vi.fn().mockResolvedValue({ data: { id: '1', name: 'bob', email: 'bob@test.com' } }),
    defaults: { auth: null },
  },
}))

describe('App auth flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
