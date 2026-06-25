import { createSlice } from '@reduxjs/toolkit'

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    sidebarOpen: true,
    mobileMenuOpen: false,
    activeModal: null,
  },
  reducers: {
    toggleSidebar(state) {
      state.sidebarOpen = !state.sidebarOpen
    },
    setMobileMenu(state, action) {
      state.mobileMenuOpen = action.payload
    },
    openModal(state, action) {
      state.activeModal = action.payload
    },
    closeModal(state) {
      state.activeModal = null
    },
  },
})

export const { toggleSidebar, setMobileMenu, openModal, closeModal } = uiSlice.actions
export default uiSlice.reducer
