import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import HlsVideo from '../src/components/HlsVideo'
import VodPlayerPage from '../src/pages/VodPlayerPage'
import VodListPage from '../src/pages/VodListPage'
import { useCatalog } from '../src/hooks/useCatalog'

const hls = vi.hoisted(() => ({ supported: true, instances: [] as Array<{ handler?: (event: string, data: unknown) => void; destroy: ReturnType<typeof vi.fn>; recoverMediaError: ReturnType<typeof vi.fn> }> }))
vi.mock('hls.js', () => ({ default: class {
  static isSupported = () => hls.supported
  static Events = { ERROR: 'error' }
  static ErrorTypes = { MEDIA_ERROR: 'mediaError' }
  handler?: (event: string, data: unknown) => void
  destroy = vi.fn()
  recoverMediaError = vi.fn()
  constructor() { hls.instances.push(this) }
  on(_event: string, handler: typeof this.handler) { this.handler = handler }
  loadSource() {}
  attachMedia() {}
} }))

beforeEach(() => { hls.instances.length = 0; hls.supported = true })

describe('live recovery', () => {
  it('retries after fatal network error and stops timers when leaving', () => {
    vi.useFakeTimers()
    const { unmount } = render(<HlsVideo src="/media/live/demo.m3u8" title="比赛" />)
    act(() => hls.instances[0].handler?.('error', { fatal: true, type: 'networkError' }))
    expect(screen.getByRole('status').textContent).toContain('5 秒后自动重试')
    expect(hls.instances[0].destroy).toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(5000))
    expect(hls.instances).toHaveLength(2)
    unmount()
    act(() => vi.advanceTimersByTime(60000))
    expect(hls.instances).toHaveLength(2)
    expect(hls.instances[1].destroy).toHaveBeenCalled()
  })

  it('bounds media recovery and falls back to reconnect', () => {
    vi.useFakeTimers()
    render(<HlsVideo src="/live.m3u8" title="比赛" />)
    const instance = hls.instances[0]
    act(() => { for (let n = 0; n < 3; n++) instance.handler?.('error', { fatal: true, type: 'mediaError' }) })
    expect(instance.recoverMediaError).toHaveBeenCalledTimes(2)
    expect(screen.getByRole('status').textContent).toContain('自动重试')
  })

  it('manual reconnect replaces the player', () => {
    render(<HlsVideo src="/live.m3u8" title="比赛" />)
    fireEvent.click(screen.getByRole('button', { name: '重新连接' }))
    expect(hls.instances).toHaveLength(2)
    expect(hls.instances[0].destroy).toHaveBeenCalled()
  })

  it('prefers MSE even when a browser claims native HLS support', () => {
    vi.spyOn(HTMLMediaElement.prototype, 'canPlayType').mockReturnValue('probably')
    render(<HlsVideo src="/live.m3u8" title="比赛" />)
    expect(hls.instances).toHaveLength(1)
  })

  it('native HLS retries on error and cleans its source', () => {
    hls.supported = false
    vi.useFakeTimers()
    vi.spyOn(HTMLMediaElement.prototype, 'canPlayType').mockReturnValue('probably')
    const { unmount } = render(<HlsVideo src="/live.m3u8" title="原生播放" />)
    const video = screen.getByLabelText('原生播放')
    fireEvent.error(video)
    expect(screen.getByRole('status').textContent).toContain('自动重试')
    act(() => vi.advanceTimersByTime(5000))
    expect(hls.instances).toHaveLength(0)
    unmount()
    expect(video.getAttribute('src')).toBeNull()
  })
})

it.each(['决赛 100%.mp4', 'literal%20name.mp4'])('does not decode filename %s twice', async (filename) => {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: filename, title: '决赛', playback_url: '/media/vod/' + encodeURIComponent(filename) }) })
  vi.stubGlobal('fetch', fetchMock)
  render(<MemoryRouter initialEntries={['/vod/' + encodeURIComponent(filename)]}><Routes><Route path="/vod/:videoId" element={<VodPlayerPage />} /></Routes></MemoryRouter>)
  expect((await screen.findByLabelText('决赛')).getAttribute('src')).toBe('/media/vod/' + encodeURIComponent(filename))
  expect(fetchMock.mock.calls[0][0]).toBe('/api/vod/detail?filename=' + encodeURIComponent(filename))
})

it('shows missing-video error instead of a broken player', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({ detail: '视频不存在或已下架' }) }))
  render(<MemoryRouter><VodPlayerPage /></MemoryRouter>)
  expect((await screen.findByRole('alert')).textContent).toContain('已下架')
  expect(document.querySelector('video')).toBeNull()
})

it('searches titles and shows no results', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [{ id: 'a.mp4', filename: 'a.mp4', title: '篮球决赛', size_bytes: 1024 }] }))
  render(<MemoryRouter><VodListPage /></MemoryRouter>)
  await screen.findByText('篮球决赛')
  fireEvent.change(screen.getByLabelText('搜索比赛'), { target: { value: '足球' } })
  expect(screen.queryByText('篮球决赛')).toBeNull()
  expect(screen.getByText('没有匹配的比赛，试试其他关键词。')).toBeTruthy()
})

it('clears a failed catalog request on retry', async () => {
  const loader = vi.fn().mockRejectedValueOnce(new Error('网络中断')).mockResolvedValueOnce('恢复成功')
  function Catalog() {
    const { data, error, retry } = useCatalog(loader)
    return <><span>{data || error}</span><button onClick={retry}>重试目录</button></>
  }
  render(<Catalog />)
  await screen.findByText('网络中断')
  fireEvent.click(screen.getByText('重试目录'))
  await screen.findByText('恢复成功')
  expect(screen.queryByText('网络中断')).toBeNull()
})

it('aborts catalog request when unmounted', async () => {
  const loader = vi.fn().mockResolvedValue([])
  function Catalog() { useCatalog(loader, 10000); return null }
  const { unmount } = render(<Catalog />)
  await waitFor(() => expect(loader).toHaveBeenCalledTimes(1))
  const signal = loader.mock.calls[0][0] as AbortSignal
  unmount()
  expect(signal.aborted).toBe(true)
})
