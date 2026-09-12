import { useEffect, useState } from 'react'

export function useCatalog<T>(loader: (signal?: AbortSignal) => Promise<T>, refreshMs = 0) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    let active = true
    let timer: ReturnType<typeof setTimeout>
    let controller: AbortController
    setData(null)
    setError('')
    async function load() {
      controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 8000)
      try {
        const result = await loader(controller.signal)
        if (active) { setData(result); setError('') }
      } catch (reason) {
        if (active) setError(controller.signal.aborted ? '请求超时，请重试。' : reason instanceof Error ? reason.message : '加载失败')
      } finally {
        clearTimeout(timeout)
        if (active && refreshMs > 0) timer = setTimeout(load, refreshMs)
      }
    }
    void load()
    return () => { active = false; clearTimeout(timer); controller?.abort() }
  }, [loader, refreshMs, revision])

  return { data, error, retry: () => setRevision((value) => value + 1) }
}
