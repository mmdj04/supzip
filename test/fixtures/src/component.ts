import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { api } from '../services/api'
import { logger } from '../utils/logger'
import { validate } from '../utils/validate'

interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'user' | 'viewer'
  createdAt: Date
  updatedAt: Date
}

interface Props {
  userId: string
  onUpdate?: (user: User) => void
  readOnly?: boolean
}

export function UserProfile({ userId, onUpdate, readOnly = false }: Props) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  const fetchUser = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await api.get<User>(`/users/${userId}`)
      if (mountedRef.current) setUser(data)
    } catch (err) {
      if (mountedRef.current) setError('Failed to load user')
      logger.error('UserProfile', err)
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchUser()
    return () => { mountedRef.current = false }
  }, [fetchUser])

  const displayName = useMemo(() => {
    if (!user) return ''
    return `${user.name} (${user.email})`
  }, [user])

  const handleSubmit = useCallback(async (data: Partial<User>) => {
    try {
      const validated = validate(data)
      const updated = await api.patch<User>(`/users/${userId}`, validated)
      setUser(updated)
      onUpdate?.(updated)
      logger.info('UserProfile', 'User updated', updated.id)
    } catch (err) {
      setError('Failed to update user')
      logger.error('UserProfile', err)
    }
  }, [userId, onUpdate])

  if (loading) return <div className="loading">Loading user...</div>
  if (error) return <div className="error">{error}</div>
  if (!user) return <div className="empty">User not found</div>

  return (
    <div className="user-profile">
      <h2>{displayName}</h2>
      <div className="user-details">
        <p><strong>Role:</strong> {user.role}</p>
        <p><strong>Created:</strong> {user.createdAt.toLocaleDateString()}</p>
        <p><strong>Updated:</strong> {user.updatedAt.toLocaleDateString()}</p>
      </div>
      {!readOnly && (
        <form onSubmit={handleSubmit} className="user-form">
          <label>
            Name:
            <input type="text" value={user.name} onChange={e => setUser({ ...user, name: e.target.value })} />
          </label>
          <label>
            Email:
            <input type="email" value={user.email} onChange={e => setUser({ ...user, email: e.target.value })} />
          </label>
          <button type="submit">Save</button>
        </form>
      )}
    </div>
  )
}
