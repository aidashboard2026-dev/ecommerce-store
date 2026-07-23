import { createSlice } from '@reduxjs/toolkit'

const storedTheme = localStorage.getItem('theme') || 
  (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')

// Apply immediately
document.documentElement.classList.toggle('dark', storedTheme === 'dark')

const themeSlice = createSlice({
  name: 'theme',
  initialState: {
    mode: storedTheme,
  },
  reducers: {
    toggleTheme(state) {
      state.mode = state.mode === 'light' ? 'dark' : 'light'
      localStorage.setItem('theme', state.mode)
      document.documentElement.classList.toggle('dark', state.mode === 'dark')
    },
    setTheme(state, action) {
      state.mode = action.payload
      localStorage.setItem('theme', state.mode)
      document.documentElement.classList.toggle('dark', state.mode === 'dark')
    },
  },
})

export const { toggleTheme, setTheme } = themeSlice.actions
export default themeSlice.reducer
