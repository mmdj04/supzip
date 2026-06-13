import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../services/api'
import { logger } from '../utils/logger'

interface QueryResult<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useQuery<T>(endpoint: string, deps: any[] = []): QueryResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await api.get<T>(endpoint)
      if (mountedRef.current) setData(result)
    } catch (err) {
      if (mountedRef.current) setError('Query failed')
      logger.error('useQuery', err)
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [endpoint])

  useEffect(() => {
    fetchData()
    return () => { mountedRef.current = false }
  }, deps)

  const refetch = useCallback(() => { fetchData() }, [fetchData])

  return { data, loading, error, refetch }
}

interface MutationResult<T> {
  execute: (data: Partial<T>) => Promise<T | null>
  loading: boolean
  error: string | null
}

export function useMutation<T>(endpoint: string): MutationResult<T> {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const execute = useCallback(async (data: Partial<T>): Promise<T | null> => {
    try {
      setLoading(true)
      setError(null)
      const result = await api.patch<T>(endpoint, data)
      logger.info('useMutation', 'Mutation succeeded', endpoint)
      return result
    } catch (err) {
      setError('Mutation failed')
      logger.error('useMutation', err)
      return null
    } finally {
      setLoading(false)
    }
  }, [endpoint])

  return { execute, loading, error }
}
