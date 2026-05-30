import { useSelector, useDispatch } from 'react-redux'
import { logout } from '../store/authSlice'
import { toggleTheme } from '../store/themeSlice'

export function useAuth() {
  const dispatch = useDispatch()
  const { token, admin, loading, error } = useSelector((s) => s.auth)

  return {
    token,
    admin,
    loading,
    error,
    isAuthenticated: !!token && !!admin,
    logout: () => dispatch(logout()),
  }
}

export function useTheme() {
  const dispatch = useDispatch()
  const { mode } = useSelector((s) => s.theme)

  return {
    theme: mode,
    isDark: mode === 'dark',
    toggle: () => dispatch(toggleTheme()),
  }
}
