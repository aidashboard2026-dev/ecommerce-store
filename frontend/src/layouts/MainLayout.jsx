import React, { useState, useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import clsx from 'clsx'

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

  const mainRef = useRef(null)
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const element = mainRef.current

    const handleScroll = () => {
      setIsScrolled(element?.scrollTop > 10)
    }

    element?.addEventListener('scroll', handleScroll)

    return () => {
      element?.removeEventListener('scroll', handleScroll)
    }
  }, [])

  return (
    <div className="h-screen overflow-hidden bg-app">
      <Header />

      <main
        ref={mainRef}
        className="h-screen w-full overflow-y-auto overflow-x-hidden overscroll-none"
      >
        {/* Sticky Header */}
        <div className="sticky top-0 z-20 transition-all duration-200 md:pl-[240px]">
          <div className="mx-auto w-full max-w-[1400px]">
            <PageHeader title={title} />
          </div>
        </div>

        {/* Page Content */}
        <div
          className="mx-auto w-full max-w-[1400px] animate-slide-up md:pl-[240px]"
          key={location.pathname}
        >
          <div className="px-6 py-6 md:px-8">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  )
}