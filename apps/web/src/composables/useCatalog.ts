import { onScopeDispose, ref, shallowRef } from 'vue'
export function useCatalog<T>(loader: (signal?: AbortSignal) => Promise<T>, refreshMs = 0) {
  const data = shallowRef<T | null>(null)
  const error = ref('')
  const loading = ref(true)
  let active = true
  let generation = 0
  let timer: ReturnType<typeof setTimeout> | undefined
  let controller: AbortController | undefined
  async function load() {
    const revision = ++generation
    clearTimeout(timer)
    controller?.abort()
    const request = new AbortController()
    controller = request
    loading.value = data.value === null
    error.value = ''
    const timeout = setTimeout(() => request.abort(), 8000)
    try {
      const result = await loader(request.signal)
      if (active && revision === generation) data.value = result
    } catch (reason) {
      if (active && revision === generation) error.value = request.signal.aborted ? '请求超时，请重试。' : reason instanceof Error ? reason.message : '加载失败'
    } finally {
      clearTimeout(timeout)
      if (active && revision === generation) {
        loading.value = false
        if (refreshMs) timer = setTimeout(load, refreshMs)
      }
    }
  }
  void load()
  onScopeDispose(() => { active = false; generation++; clearTimeout(timer); controller?.abort() })
  return { data, error, loading, retry: load }
}
