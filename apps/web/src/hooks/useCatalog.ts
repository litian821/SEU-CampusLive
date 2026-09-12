import { useEffect, useState } from 'react'

export function useCatalog<T>(loader: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    loader()
      .then((result) => active && setData(result))
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : '加载失败')
      })
    return () => { active = false }
  }, [loader])

  return { data, error }
}
