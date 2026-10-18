'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'

const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().trim().min(8, 'Enter a valid phone number'),
  role: z.enum(['tourist', 'farmer']),
})

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTarget = searchParams.get('redirect')

  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<'tourist' | 'farmer'>('tourist')

  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [infoMsg, setInfoMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMsg(null)
    setInfoMsg(null)

    const parsed = loginSchema.safeParse({ email, password })
    if (!parsed.success) {
      setErrorMsg(parsed.error.issues[0]?.message || 'Please check your inputs')
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.password,
      })

      if (error) {
        setErrorMsg(error.message)
        return
      }

      // Read role from profiles table (fallback to user_metadata)
      let role = data.user?.user_metadata?.role || null
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single()
        if (profile?.role) {
          role = profile.role
        }
      } catch {
        // Fallback to user_metadata
      }

      const isSafeRedirect =
        typeof redirectTarget === 'string' &&
        redirectTarget.startsWith('/') &&
        !redirectTarget.startsWith('//') &&
        !redirectTarget.startsWith('/login')

      const destination = isSafeRedirect
        ? redirectTarget
        : role === 'farmer'
        ? '/dashboard'
        : '/'

      router.push(destination)
      router.refresh()

      if (typeof window !== 'undefined') {
        setTimeout(() => {
          if (window.location.pathname === '/login') {
            window.location.href = destination
          }
        }, 200)
      }
    } catch {
      setErrorMsg('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMsg(null)
    setInfoMsg(null)

    const parsed = registerSchema.safeParse({
      name,
      email,
      password,
      phone,
      role,
    })

    if (!parsed.success) {
      setErrorMsg(parsed.error.issues[0]?.message || 'Please check your inputs')
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: {
          data: {
            full_name: parsed.data.name,
            phone: parsed.data.phone,
            role: parsed.data.role,
          },
        },
      })

      if (error) {
        setErrorMsg(error.message)
        return
      }

      if (data.session) {
        const isSafeRedirect =
          typeof redirectTarget === 'string' &&
          redirectTarget.startsWith('/') &&
          !redirectTarget.startsWith('//') &&
          !redirectTarget.startsWith('/login')

        const destination = isSafeRedirect
          ? redirectTarget
          : parsed.data.role === 'farmer'
          ? '/dashboard'
          : '/'
        router.push(destination)
        router.refresh()
      } else {
        setInfoMsg(
          'Registration complete. If email confirmation is enabled for your project, please check your inbox before logging in.',
        )
      }
    } catch {
      setErrorMsg('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section
      className="booking-page"
      style={{ maxWidth: '520px', margin: '40px auto 100px' }}
    >
      <Link className="back-link" href="/">
        &larr; Back to home
      </Link>

      <div className="booking-form">
        <div className="form-header">
          <div>
            <p className="section-kicker">Member access</p>
            <h2>{mode === 'login' ? 'Account login' : 'Create an account'}</h2>
          </div>
        </div>

        {/* Tab Switcher */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '20px',
            borderBottom: '1px solid var(--line)',
            paddingBottom: '12px',
          }}
        >
          <button
            type="button"
            onClick={() => {
              setMode('login')
              setErrorMsg(null)
              setInfoMsg(null)
            }}
            style={{
              padding: '8px 16px',
              fontSize: '12px',
              fontWeight: mode === 'login' ? 700 : 500,
              color: mode === 'login' ? '#ffffff' : 'var(--muted)',
              backgroundColor:
                mode === 'login' ? 'var(--forest)' : 'transparent',
              border: '1px solid var(--line)',
              cursor: 'pointer',
            }}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register')
              setErrorMsg(null)
              setInfoMsg(null)
            }}
            style={{
              padding: '8px 16px',
              fontSize: '12px',
              fontWeight: mode === 'register' ? 700 : 500,
              color: mode === 'register' ? '#ffffff' : 'var(--muted)',
              backgroundColor:
                mode === 'register' ? 'var(--forest)' : 'transparent',
              border: '1px solid var(--line)',
              cursor: 'pointer',
            }}
          >
            Register
          </button>
        </div>

        {errorMsg && (
          <div
            style={{
              color: 'var(--ink)',
              background: '#faeae8',
              padding: '10px 14px',
              fontSize: '12px',
              marginBottom: '16px',
              border: '1px solid #e8bcba',
            }}
          >
            {errorMsg}
          </div>
        )}

        {infoMsg && (
          <div
            style={{
              color: 'var(--forest)',
              background: 'var(--mint)',
              padding: '12px 14px',
              fontSize: '12px',
              marginBottom: '16px',
              border: '1px solid var(--line)',
              display: 'flex',
              gap: '8px',
              alignItems: 'start',
            }}
          >
            <CheckCircle2 size={16} style={{ marginTop: '2px', flexShrink: 0 }} />
            <span>{infoMsg}</span>
          </div>
        )}

        {mode === 'login' ? (
          <form onSubmit={handleLogin}>
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
            >
              <label
                style={{
                  fontSize: '11px',
                  color: 'var(--muted)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '7px',
                }}
              >
                Email address
                <input
                  required
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    border: '1px solid var(--line)',
                    padding: '11px',
                    fontSize: '12px',
                  }}
                />
              </label>

              <label
                style={{
                  fontSize: '11px',
                  color: 'var(--muted)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '7px',
                }}
              >
                Password
                <input
                  required
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    border: '1px solid var(--line)',
                    padding: '11px',
                    fontSize: '12px',
                  }}
                />
              </label>
            </div>

            <button
              className="primary-btn submit-btn"
              type="submit"
              disabled={loading}
              style={{ width: '100%', marginTop: '22px' }}
            >
              {loading ? 'Signing in...' : 'Sign in'} <ArrowRight size={17} />
            </button>

            <div
              style={{
                marginTop: '16px',
                padding: '12px',
                background: '#f8faf6',
                border: '1px solid var(--line)',
                textAlign: 'center',
              }}
            >
              <span
                style={{
                  display: 'block',
                  fontSize: '11px',
                  color: 'var(--muted)',
                  marginBottom: '8px',
                  fontWeight: 600,
                }}
              >
                Quick Demo Sign-In
              </span>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={() => {
                    setEmail('farmer@agritrails.dev')
                    setPassword('123456')
                    setErrorMsg(null)
                  }}
                  style={{
                    background: '#ffffff',
                    border: '1px solid var(--forest)',
                    color: 'var(--forest)',
                    padding: '6px 12px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    borderRadius: '2px',
                  }}
                >
                  Farmer (Rajesh Patil)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmail('tourist@agritrails.dev')
                    setPassword('123456')
                    setErrorMsg(null)
                  }}
                  style={{
                    background: '#ffffff',
                    border: '1px solid var(--forest)',
                    color: 'var(--forest)',
                    padding: '6px 12px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    borderRadius: '2px',
                  }}
                >
                  Tourist (Ananya Roy)
                </button>
              </div>
            </div>
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
            >
              <label
                style={{
                  fontSize: '11px',
                  color: 'var(--muted)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '7px',
                }}
              >
                Full name
                <input
                  required
                  type="text"
                  placeholder="e.g. Ramesh Deshmukh"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    border: '1px solid var(--line)',
                    padding: '11px',
                    fontSize: '12px',
                  }}
                />
              </label>

              <label
                style={{
                  fontSize: '11px',
                  color: 'var(--muted)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '7px',
                }}
              >
                Email address
                <input
                  required
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    border: '1px solid var(--line)',
                    padding: '11px',
                    fontSize: '12px',
                  }}
                />
              </label>

              <label
                style={{
                  fontSize: '11px',
                  color: 'var(--muted)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '7px',
                }}
              >
                Phone number
                <input
                  required
                  type="tel"
                  placeholder="+91 98000 00000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{
                    border: '1px solid var(--line)',
                    padding: '11px',
                    fontSize: '12px',
                  }}
                />
              </label>

              <label
                style={{
                  fontSize: '11px',
                  color: 'var(--muted)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '7px',
                }}
              >
                Password
                <input
                  required
                  type="password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    border: '1px solid var(--line)',
                    padding: '11px',
                    fontSize: '12px',
                  }}
                />
              </label>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                  I want to join AgriTrails as:
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <label
                    style={{
                      border: '1px solid',
                      borderColor: role === 'tourist' ? 'var(--forest)' : 'var(--line)',
                      background: role === 'tourist' ? 'var(--mint)' : '#ffffff',
                      padding: '10px 12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '12px',
                      color: 'var(--ink)',
                      fontWeight: role === 'tourist' ? 700 : 500,
                    }}
                  >
                    <input
                      type="radio"
                      name="role"
                      value="tourist"
                      checked={role === 'tourist'}
                      onChange={() => setRole('tourist')}
                      style={{ accentColor: 'var(--forest)' }}
                    />
                    Tourist / Guest
                  </label>
                  <label
                    style={{
                      border: '1px solid',
                      borderColor: role === 'farmer' ? 'var(--forest)' : 'var(--line)',
                      background: role === 'farmer' ? 'var(--mint)' : '#ffffff',
                      padding: '10px 12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '12px',
                      color: 'var(--ink)',
                      fontWeight: role === 'farmer' ? 700 : 500,
                    }}
                  >
                    <input
                      type="radio"
                      name="role"
                      value="farmer"
                      checked={role === 'farmer'}
                      onChange={() => setRole('farmer')}
                      style={{ accentColor: 'var(--forest)' }}
                    />
                    Host / Farmer
                  </label>
                </div>
              </div>
            </div>

            <button
              className="primary-btn submit-btn"
              type="submit"
              disabled={loading}
              style={{ width: '100%', marginTop: '22px' }}
            >
              {loading ? 'Creating account...' : 'Create account'}{' '}
              <ArrowRight size={17} />
            </button>

            <p className="form-note">
              Host accounts and guest reservations are secured under rural community guidelines.
            </p>
          </form>
        )}
      </div>
    </section>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <section
          className="booking-page"
          style={{ maxWidth: '520px', margin: '40px auto 100px', textAlign: 'center' }}
        >
          <div className="booking-form">
            <p style={{ color: 'var(--muted)', fontSize: '13px' }}>Loading member access...</p>
          </div>
        </section>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
