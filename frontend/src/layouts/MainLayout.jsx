import React from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Header from '../components/layout/Header'


const pageTitles = {
  '/': 'Dashboard',
  '/products': 'Products',
  '/orders': 'Orders',
  '/offers': 'Offers',
  '/customers': 'Customers',
  '/settings': 'Settings',
}

export default function MainLayout() {
  const location = useLocation()
  const title = pageTitles[location.pathname] || 'Dashboard'

  return (
    <div className="h-screen overflow-hidden bg-surface">
      <Header />
      <main className="h-screen w-full overflow-y-auto overflow-x-hidden px-4 pb-8 pt-20 sm:px-6 md:pl-[264px] md:pr-6 md:pt-6 lg:pr-8">
        <div className="mx-auto w-full max-w-[1400px] animate-slide-up" key={location.pathname}>
          <div className="mb-6">
            <p className="text-sm font-medium text-muted">Admin Dashboard</p>
            <h1 className="text-2xl font-bold tracking-normal text-app">{title}</h1>
          </div>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
