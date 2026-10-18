'use client'

import { useState, Suspense, useMemo } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { useTranslations } from 'next-intl'

function LoginForm() {
  const t = useTranslations('auth')
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTarget = searchParams.get('redirect')

  const loginSchema = useMemo(
    () =>
      z.object({
        email: z.string().trim().email(t('errors.validEmail')),
        password: z.string().min(6, t('errors.passwordLength')),
      }),
    [t],
  )

  const registerSchema = useMemo(
    () =>
      z.object({
        name: z.string().trim().min(2, t('errors.nameLength')),
        email: z.string().trim().email(t('errors.validEmail')),
        password: z.string().min(6, t('errors.passwordLength')),
        phone: z.string().trim().min(8, t('errors.validPhone')),
        role: z.enum(['tourist', 'farmer']),
      }),
    [t],
  )

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
      setErrorMsg(parsed.error.issues[0]?.message || t('checkInputsError'))
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
      setErrorMsg(t('unexpectedError'))
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
      setErrorMsg(parsed.error.issues[0]?.message || t('checkInputsError'))
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
        setInfoMsg(t('registrationEmailNote'))
      }
    } catch {
      setErrorMsg(t('unexpectedError'))
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
        &larr; {t('backToHome')}
      </Link>

      <div className="booking-form">
        <div className="form-header">
          <div>
            <p className="section-kicker">{t('memberAccess')}</p>
            <h2>{mode === 'login' ? t('loginTitle') : t('registerTitle')}</h2>
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
            {t('signInTab')}
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
            {t('registerTab')}
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
                {t('emailLabel')}
                <input
                  required
                  type="email"
                  placeholder={t('emailPlaceholder')}
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
                {t('passwordLabel')}
                <input
                  required
                  type="password"
                  placeholder={t('passwordPlaceholder')}
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
              {loading ? t('signingIn') : t('signInButton')} <ArrowRight size={17} />
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
                {t('quickDemoTitle')}
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
                  {t('demoFarmer')}
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
                  {t('demoTourist')}
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
                {t('fullNameLabel')}
                <input
                  required
                  type="text"
                  placeholder={t('fullNamePlaceholder')}
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
                {t('emailLabel')}
                <input
                  required
                  type="email"
                  placeholder={t('emailPlaceholder')}
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
                {t('phoneLabel')}
                <input
                  required
                  type="tel"
                  placeholder={t('phonePlaceholder')}
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
                {t('passwordLabel')}
                <input
                  required
                  type="password"
                  placeholder={t('passwordPlaceholderRegister')}
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
                  {t('roleQuestion')}
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
                    {t('roleTourist')}
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
                    {t('roleFarmer')}
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
              {loading ? t('creatingAccount') : t('createAccountButton')}{' '}
              <ArrowRight size={17} />
            </button>

            <p className="form-note">
              {t('communityNote')}
            </p>
          </form>
        )}
      </div>
    </section>
  )
}

function LoginFallback() {
  const t = useTranslations('auth')
  return (
    <section
      className="booking-page"
      style={{ maxWidth: '520px', margin: '40px auto 100px', textAlign: 'center' }}
    >
      <div className="booking-form">
        <p style={{ color: 'var(--muted)', fontSize: '13px' }}>{t('loadingMemberAccess')}</p>
      </div>
    </section>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  )
}

