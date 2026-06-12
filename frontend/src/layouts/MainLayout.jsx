import React from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Header from '../components/layout/Header'
import PageHeader from '../components/layout/PageHeader'


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
          <PageHeader title={title} />
          <Outlet />
        </div>
      </main>
    </div>
  )
}
