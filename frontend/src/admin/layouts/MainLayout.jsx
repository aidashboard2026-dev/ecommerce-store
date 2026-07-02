import React, { useState, useEffect, useRef, Suspense } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import clsx from 'clsx'

import Header from '@/admin/components/layout/Header'
import PageHeader from '@/admin/components/layout/PageHeader'
import { PageLoader } from '@/shared/components/common/Spinner'

const pageTitles = {
  '/admin': 'Dashboard',
  '/admin/products': 'Products',
  '/admin/categories': 'Categories',
  '/admin/orders': 'Orders',
  '/admin/offers': 'Offers',
  '/admin/banners': 'Banners',
  '/admin/customers': 'Customers',
  '/admin/settings': 'Settings',
}

export default function MainLayout() {
  const location = useLocation()
  const title = pageTitles[location.pathname] || 'Dashboard'

  const mainRef = useRef(null)
  const [isScrolled, setIsScrolled] = useState(false)
  const sidebarOpen = useSelector((s) => s.ui.sidebarOpen)

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

  // Reset scroll position of content panel on navigation
  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0
    }
  }, [location.pathname])

  return (
    <div className="h-screen overflow-hidden bg-app">
      <Header />

      <main
        ref={mainRef}
        className="h-screen w-full overflow-y-auto overflow-x-hidden overscroll-none"
      >
        {/* Sticky Header */}
        <div
          className={clsx(
            'md:sticky md:top-0 z-20 md:pl-60 md:transition-all md:duration-300',
          )}
        >
          <div className="mx-auto w-full max-w-[1400px]">
            <PageHeader title={title} />
          </div>
        </div>

        {/* Page Content */}
        <div
          className={clsx(
            'mx-auto w-full md:pl-60 md:pb-0 pb-20 max-w-[1400px] animate-slide-up transition-all duration-300',
          )}
        >
          <div className="px-6 py-6 md:px-8">
            <Suspense fallback={<PageLoader />}>
              <Outlet />
            </Suspense>
          </div>
        </div>
      </main>
    </div>
  )
}

