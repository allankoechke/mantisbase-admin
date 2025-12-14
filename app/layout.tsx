import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Mantis Admin Dashboard',
  description: 'Admin dashboard for Mantis: A lightweight BaaS in C++'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/mantisbase.svg" type="image/svg+xml" />
        <link rel="alternate icon" href="/favicon.ico" />
      </head>
      <body>{children}</body>
    </html>
  )
}
