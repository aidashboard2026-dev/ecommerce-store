import React from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Header from '../components/layout/Header'

const pageTitles = {
  '/': 'Dashboard',
  '/users': 'Users',
  '/products': 'Products',
  '/analytics': 'Analytics',
  '/settings': 'Settings',
}

export default function MainLayout() {
  const location = useLocation()
  const title = pageTitles[location.pathname] || 'Dashboard'

  return (
    <div className="min-h-screen bg-app flex flex-col">
      <Header />
      <main className="flex-1 pt-20 px-4 sm:px-6 lg:px-8 max-w-[1400px] mx-auto w-full pb-8">
        <div className="animate-slide-up" key={location.pathname}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
