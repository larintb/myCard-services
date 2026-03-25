'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useParams } from 'next/navigation'
import Link from 'next/link'

function AdminBottomNav({ businessname }: { businessname: string }) {
  const pathname = usePathname()

  const tabs = [
    {
      label: 'Inicio',
      href: `/${businessname}/dashboard`,
      match: '/dashboard',
      icon: (active: boolean) => (
        <svg className="w-6 h-6" fill={active ? '#6366F1' : 'none'} stroke={active ? '#6366F1' : '#8E8E93'} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      label: 'Citas',
      href: `/${businessname}/appointments`,
      match: '/appointments',
      icon: (active: boolean) => (
        <svg className="w-6 h-6" fill={active ? '#6366F1' : 'none'} stroke={active ? '#6366F1' : '#8E8E93'} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      label: 'Servicios',
      href: `/${businessname}/services`,
      match: '/services',
      icon: (active: boolean) => (
        <svg className="w-6 h-6" fill="none" stroke={active ? '#6366F1' : '#8E8E93'} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
            d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      ),
    },
    {
      label: 'Clientes',
      href: `/${businessname}/clients`,
      match: '/clients',
      icon: (active: boolean) => (
        <svg className="w-6 h-6" fill="none" stroke={active ? '#6366F1' : '#8E8E93'} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      label: 'Ajustes',
      href: `/${businessname}/settings`,
      match: '/settings',
      icon: (active: boolean) => (
        <svg className="w-6 h-6" fill="none" stroke={active ? '#6366F1' : '#8E8E93'} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ]

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around"
      style={{
        height: 64,
        backgroundColor: '#FFFFFF',
        borderTop: '1px solid #E5E5EA',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {tabs.map(tab => {
        const active = pathname.includes(tab.match)
        return (
          <Link
            key={tab.label}
            href={tab.href}
            className="flex flex-col items-center justify-center flex-1 gap-0.5 py-2"
          >
            {tab.icon(active)}
            <span
              className="text-[10px] font-medium"
              style={{ color: active ? '#6366F1' : '#8E8E93' }}
            >
              {tab.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}

export default function BusinessLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const routeParams = useParams()
  const businessname = routeParams.businessname as string

  useEffect(() => {
    document.body.style.backgroundColor = '#F2F2F7'
    return () => { document.body.style.backgroundColor = '' }
  }, [])

  const isLogin = pathname?.includes('/login')

  if (isLogin) {
    return <>{children}</>
  }

  return (
    <>
      <div style={{ paddingBottom: 64 }}>{children}</div>
      <AdminBottomNav businessname={businessname} />
    </>
  )
}
