'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ArrowRight, Compass, Leaf, LogOut, Menu, Tractor, User, X } from 'lucide-react'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [role, setRole] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()

    const resolveUser = async (currentUser: SupabaseUser | null) => {
      setUser(currentUser)
      if (!currentUser) {
        setUserName(null)
        setRole(null)
        return
      }

      setUserName(
        currentUser.user_metadata?.full_name ||
          currentUser.email?.split('@')[0] ||
          'Member',
      )

      let userRole = currentUser.user_metadata?.role || null
      if (!userRole) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', currentUser.id)
            .single()
          if (profile?.role) {
            userRole = profile.role
          }
        } catch {
          // Fallback to null or metadata
        }
      }
      setRole(userRole)
    }

    // Initial check
    supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
      resolveUser(currentUser)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      resolveUser(session?.user ?? null)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
    setUserName(null)
    setRole(null)
    setMenuOpen(false)
    router.push('/')
    router.refresh()
  }

  const isHome = pathname === '/'
  const isExplore = pathname.startsWith('/explore') || pathname.startsWith('/farms')

  return (
    <header className="site-header">
      <Link
        className="brand"
        href="/"
        aria-label="Go to AgriTrails home"
        onClick={() => setMenuOpen(false)}
      >
        <span className="brand-mark">
          <Leaf size={19} fill="currentColor" />
        </span>
        <span>
          agri<span>trails</span>
        </span>
      </Link>

      <button
        className="mobile-toggle"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Toggle navigation"
        type="button"
      >
        {menuOpen ? <X /> : <Menu />}
      </button>

      <nav
        className={menuOpen ? 'main-nav is-open' : 'main-nav'}
        aria-label="Main navigation"
      >
        <Link
          className={isHome ? 'active' : ''}
          href="/"
          onClick={() => setMenuOpen(false)}
        >
          Home
        </Link>
        <Link
          className={isExplore ? 'active' : ''}
          href="/explore"
          onClick={() => setMenuOpen(false)}
        >
          Explore farms
        </Link>
        <Link href="/#produce" onClick={() => setMenuOpen(false)}>
          Farm-fresh produce
        </Link>
        <Link href="/#story" onClick={() => setMenuOpen(false)}>
          About us
        </Link>

        {/* Mobile-only auth controls */}
        {menuOpen && (
          <div
            style={{
              paddingTop: '16px',
              borderTop: '1px solid var(--line)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {role === 'farmer' ? (
              <Link
                className="farmer-link"
                href="/dashboard"
                onClick={() => setMenuOpen(false)}
              >
                <Tractor size={16} /> Farmer portal
              </Link>
            ) : user ? (
              <Link
                className="farmer-link"
                href="/dashboard?view=tourist"
                onClick={() => setMenuOpen(false)}
              >
                <Compass size={16} /> My Bookings & Travel Cards
              </Link>
            ) : null}

            {user ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: 'var(--forest)',
                  }}
                >
                  {userName}
                </span>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="login-btn"
                  style={{ padding: '8px 12px', fontSize: '11px' }}
                >
                  Sign out <LogOut size={13} />
                </button>
              </div>
            ) : (
              <Link
                className="login-btn"
                href="/login"
                onClick={() => setMenuOpen(false)}
              >
                Login / Register <ArrowRight size={15} />
              </Link>
            )}
          </div>
        )}
      </nav>

      {/* Desktop auth actions */}
      <div className="header-actions">
        {role === 'farmer' ? (
          <Link
            className="farmer-link"
            href="/dashboard"
            onClick={() => setMenuOpen(false)}
          >
            <Tractor size={16} /> Farmer portal
          </Link>
        ) : user ? (
          <Link
            className="farmer-link"
            href="/dashboard?view=tourist"
            onClick={() => setMenuOpen(false)}
          >
            <Compass size={16} /> My Bookings
          </Link>
        ) : null}

        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                fontWeight: 700,
                color: 'var(--ink)',
              }}
            >
              <User size={14} style={{ color: 'var(--leaf)' }} />
              {userName}
            </span>
            <button
              type="button"
              onClick={handleSignOut}
              className="login-btn"
              style={{
                padding: '8px 14px',
                fontSize: '12px',
                background: 'transparent',
                color: 'var(--forest)',
                border: '1px solid var(--forest)',
                boxShadow: 'none',
              }}
            >
              Sign out <LogOut size={14} />
            </button>
          </div>
        ) : (
          <Link
            className="login-btn"
            href="/login"
            onClick={() => setMenuOpen(false)}
          >
            Login / Register <ArrowRight size={15} />
          </Link>
        )}
      </div>
    </header>
  )
}
