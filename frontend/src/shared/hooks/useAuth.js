import { useCallback } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { logout } from '@/admin/store/authSlice'
import { toggleTheme } from '@/admin/store/themeSlice'

export function useAuth() {
  const dispatch = useDispatch()
  const { token, admin, loading, error } = useSelector((s) => s.auth)

  const handleLogout = useCallback(() => {
    dispatch(logout())
  }, [dispatch])

  return {
    token,
    admin,
    loading,
    error,
    isAuthenticated: !!token && !!admin,
    logout: handleLogout,
  }
}

export function useTheme() {
  const dispatch = useDispatch()
  const { mode } = useSelector((s) => s.theme)

  const toggle = useCallback(() => {
    dispatch(toggleTheme())
  }, [dispatch])

  return {
    theme: mode,
    isDark: mode === 'dark',
    toggle,
  }
}
