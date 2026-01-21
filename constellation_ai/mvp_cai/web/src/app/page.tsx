'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { RecentMeetings } from '@/components/RecentMeetings'

export default function Home() {
  const [health, setHealth] = useState<{ status: string } | null>(null)

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/health`)
      .then(res => res.json())
      .then(setHealth)
      .catch(() => setHealth({ status: 'error' }))
  }, [])

  const isHealthy = health?.status === 'healthy'

  return (
    <main style={{ padding: '48px', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '8px' }}>
        CRM
      </h1>
      <p style={{ color: '#6b7280', marginBottom: '32px' }}>
        Customer Relationship Management
      </p>

      {/* API Status */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '32px',
          padding: '12px 16px',
          backgroundColor: isHealthy ? '#f0fdf4' : '#fef2f2',
          borderRadius: '8px',
          fontSize: '14px',
        }}
      >
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: isHealthy ? '#22c55e' : '#ef4444',
          }}
        />
        <span style={{ color: isHealthy ? '#166534' : '#991b1b' }}>
          API Status: {health ? health.status : 'checking...'}
        </span>
      </div>

      {/* Navigation */}
      <nav>
        <Link
          href="/people"
          style={{
            display: 'block',
            padding: '16px 20px',
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            textDecoration: 'none',
            color: '#111827',
            marginBottom: '12px',
            transition: 'border-color 0.2s',
          }}
        >
          <span style={{ fontSize: '18px', fontWeight: 500 }}>People</span>
          <p style={{ color: '#6b7280', fontSize: '14px', margin: '4px 0 0' }}>
            Manage contacts and view their meeting history
          </p>
        </Link>

        <Link
          href="/meetings/new"
          style={{
            display: 'block',
            padding: '16px 20px',
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            textDecoration: 'none',
            color: '#111827',
            marginBottom: '12px',
            transition: 'border-color 0.2s',
          }}
        >
          <span style={{ fontSize: '18px', fontWeight: 500 }}>Log Meeting</span>
          <p style={{ color: '#6b7280', fontSize: '14px', margin: '4px 0 0' }}>
            Record a new meeting with attendees
          </p>
        </Link>

        <Link
          href="/search"
          style={{
            display: 'block',
            padding: '16px 20px',
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            textDecoration: 'none',
            color: '#111827',
            marginBottom: '12px',
            transition: 'border-color 0.2s',
          }}
        >
          <span style={{ fontSize: '18px', fontWeight: 500 }}>Search</span>
          <p style={{ color: '#6b7280', fontSize: '14px', margin: '4px 0 0' }}>
            Search across people and meetings
          </p>
        </Link>
      </nav>

      {/* Recent Meetings Widget */}
      <div style={{ marginTop: '32px' }}>
        <RecentMeetings />
      </div>
    </main>
  )
}
