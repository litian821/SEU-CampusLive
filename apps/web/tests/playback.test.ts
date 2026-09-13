import { defineComponent, h, nextTick } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import HlsVideo from '../src/components/HlsVideo.vue'
import WatchPage from '../src/pages/WatchPage.vue'
import CatalogPage from '../src/pages/CatalogPage.vue'
import MomentsPage from '../src/pages/MomentsPage.vue'
import MediaCover from '../src/components/MediaCover.vue'
import { useCatalog } from '../src/composables/useCatalog'

const state = vi.hoisted(() => ({ supported: true, instances: [] as Array<{ handler?: (event: string, data: unknown) => void; destroy: ReturnType<typeof vi.fn>; recoverMediaError: ReturnType<typeof vi.fn> }> }))
vi.mock('hls.js', () => ({ default: class {
  static isSupported = () => state.supported
  static Events = { ERROR: 'error' }
  static ErrorTypes = { MEDIA_ERROR: 'mediaError' }
  handler?: (event: string, data: unknown) => void
  destroy = vi.fn()
  recoverMediaError = vi.fn()
  constructor() { state.instances.push(this) }
  on(_event: string, handler: typeof this.handler) { this.handler = handler }
  loadSource() {}
  attachMedia() {}
} }))
beforeEach(() => { state.instances.length = 0; state.supported = true })

async function routing(path: string) {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div />' } }, { path: '/vod/:id', component: WatchPage }] })
  await router.push(path)
  await router.isReady()
  return router
}
describe('live recovery', () => {
  it('adapts the frame to portrait metadata and toggles fill mode', async () => {
    const wrapper = mount(HlsVideo, { props: { src: '/live.m3u8', title: '比赛' } })
    const element = wrapper.get('video').element
    Object.defineProperties(element, { videoWidth: { configurable: true, value: 720 }, videoHeight: { configurable: true, value: 1280 } })
    await wrapper.get('video').trigger('loadedmetadata')
    expect(wrapper.get('.player-frame').classes()).toContain('is-portrait')
    expect(wrapper.get('.player-frame').attributes('style')).toContain('--video-aspect: 720 / 1280')
    expect(wrapper.text()).toContain('输入 720 × 1280')
    const fitButton = wrapper.get('[aria-pressed="false"]')
    await fitButton.trigger('click')
    expect(wrapper.get('video').classes()).toContain('fit-cover')
    expect(wrapper.get('[aria-pressed="true"]').text()).toBe('完整显示')
  })
  it('retries fatal network errors and cancels timers on exit', async () => {
    vi.useFakeTimers()
    const wrapper = mount(HlsVideo, { props: { src: '/live.m3u8', title: '比赛' } })
    state.instances[0].handler?.('error', { fatal: true, type: 'networkError' })
    await nextTick()
    expect(wrapper.get('[role=status]').text()).toContain('5 秒后自动重试')
    expect(state.instances[0].destroy).toHaveBeenCalled()
    vi.advanceTimersByTime(5000)
    expect(state.instances).toHaveLength(2)
    wrapper.unmount()
    vi.advanceTimersByTime(60000)
    expect(state.instances).toHaveLength(2)
    expect(state.instances[1].destroy).toHaveBeenCalled()
  })
  it('bounds media recovery and manually reconnects', async () => {
    const wrapper = mount(HlsVideo, { props: { src: '/live.m3u8', title: '比赛' } })
    const first = state.instances[0]
    for (let n = 0; n < 3; n++) first.handler?.('error', { fatal: true, type: 'mediaError' })
    await nextTick()
    expect(first.recoverMediaError).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('自动重试')
    await wrapper.findAll('button').at(-1)!.trigger('click')
    expect(state.instances).toHaveLength(2)
    expect(first.destroy).toHaveBeenCalled()
  })
  it('prefers MSE even when native HLS is advertised', () => {
    vi.spyOn(HTMLMediaElement.prototype, 'canPlayType').mockReturnValue('probably')
    mount(HlsVideo, { props: { src: '/live.m3u8', title: '比赛' } })
    expect(state.instances).toHaveLength(1)
  })
  it('native HLS retries and removes source on unmount', async () => {
    state.supported = false
    vi.useFakeTimers()
    vi.spyOn(HTMLMediaElement.prototype, 'canPlayType').mockReturnValue('probably')
    const wrapper = mount(HlsVideo, { props: { src: '/live.m3u8', title: '比赛' } })
    const video = wrapper.get('video').element
    await wrapper.get('video').trigger('error')
    expect(wrapper.text()).toContain('自动重试')
    vi.advanceTimersByTime(5000)
    expect(state.instances).toHaveLength(0)
    wrapper.unmount()
    expect(video.getAttribute('src')).toBeNull()
  })
})
it.each(['决赛 100%.mp4', 'literal%20name.mp4'])('does not double-decode %s', async filename => {
  const mock = vi.fn().mockImplementation(async (url: string) => ({ ok: true, json: async () => url === '/api/vod' ? [] : { id: filename, title: '决赛', filename, size_bytes: 1024, playback_url: '/media/vod/' + encodeURIComponent(filename) } }))
  vi.stubGlobal('fetch', mock)
  const router = await routing('/vod/' + encodeURIComponent(filename))
  const wrapper = mount(WatchPage, { props: { kind: 'vod' }, global: { plugins: [router] } })
  await flushPromises()
  expect(wrapper.get('video').attributes('src')).toBe('/media/vod/' + encodeURIComponent(filename))
  expect(mock.mock.calls[0][0]).toBe('/api/vod/detail?filename=' + encodeURIComponent(filename))
})
it('shows missing videos without rendering a player', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({ detail: '视频不存在或已下架' }) }))
  const wrapper = mount(WatchPage, { props: { kind: 'vod' }, global: { plugins: [await routing('/vod/gone.mp4')] } })
  await flushPromises()
  expect(wrapper.get('[role=alert]').text()).toContain('已下架')
  expect(wrapper.find('video').exists()).toBe(false)
})
it('searches files and handles no results', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [{ id: 'a.mp4', filename: 'a.mp4', title: '篮球决赛', size_bytes: 1024 }] }))
  const wrapper = mount(CatalogPage, { props: { kind: 'vod' }, global: { plugins: [await routing('/vod')] } })
  await flushPromises()
  expect(wrapper.text()).toContain('篮球决赛')
  await wrapper.get('[aria-label="搜索比赛"]').setValue('足球')
  expect(wrapper.text()).not.toContain('篮球决赛')
  expect(wrapper.text()).toContain('没有匹配的比赛')
})
it('retries requests and aborts on unmount', async () => {
  const loader = vi.fn().mockRejectedValueOnce(new Error('网络中断')).mockResolvedValue('恢复成功')
  const component = defineComponent({ setup() { const { data, error, retry } = useCatalog(loader, 10000); return () => h('button', { onClick: retry }, String(data.value || error.value)) } })
  const wrapper = mount(component)
  await flushPromises()
  expect(wrapper.text()).toBe('网络中断')
  await wrapper.trigger('click')
  await flushPromises()
  expect(wrapper.text()).toBe('恢复成功')
  const signal = loader.mock.calls[1][0] as AbortSignal
  wrapper.unmount()
  expect(signal.aborted).toBe(true)
})
it('uses a branded fallback when an image fails', async () => {
  const wrapper = mount(MediaCover, { props: { src: '/missing.jpg', alt: '比赛', sport: '篮球' } })
  await wrapper.get('img').trigger('error')
  expect(wrapper.find('img').exists()).toBe(false)
  expect(wrapper.text()).toContain('篮球')
})
it('filters albums and opens/closes a photo viewer', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [
    { id: 'a', title: '院系杯', photos: [{ id: 'a/1', title: '篮下对抗', url: '/photo.jpg', size_bytes: 100 }] },
    { id: 'b', title: '友谊赛', photos: [{ id: 'b/2', title: '投篮', url: '/photo2.jpg', size_bytes: 100 }] },
  ] }))
  const wrapper = mount(MomentsPage, { attachTo: document.body, global: { plugins: [await routing('/moments')] } })
  await flushPromises()
  await wrapper.get('select').setValue('a')
  expect(wrapper.findAll('.photo-button')).toHaveLength(1)
  await wrapper.get('.photo-button').trigger('click')
  await flushPromises()
  expect(wrapper.get('dialog').attributes()).toHaveProperty('open')
  expect(wrapper.get('dialog img').attributes('src')).toBe('/photo.jpg')
  await wrapper.get('[aria-label="关闭照片"]').trigger('click')
  expect(wrapper.get('dialog').attributes()).not.toHaveProperty('open')
  expect(document.body.style.overflow).toBe('')
  wrapper.unmount()
})
