import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import { useLocationSearch } from './useLocationSearch'
import * as api from '@/services/api'

vi.mock('@/services/api')
const geocode = vi.mocked(api.geocode)

const flush = async () => {
  await vi.advanceTimersByTimeAsync(0)
  await nextTick()
}

describe('useLocationSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    geocode.mockReset()
    geocode.mockResolvedValue([{ name: 'Santos', latitude: 1, longitude: 2 }])
  })

  it('does not search with fewer than 3 characters', async () => {
    const q = ref('')
    useLocationSearch(q)
    q.value = 'sa'
    await nextTick()
    await vi.advanceTimersByTimeAsync(1000)
    expect(geocode).not.toHaveBeenCalled()
  })

  it('waits 500ms after the last keystroke (debounce)', async () => {
    const q = ref('')
    const { results } = useLocationSearch(q)
    q.value = 'san'
    await nextTick()
    await vi.advanceTimersByTimeAsync(400)
    q.value = 'sant'
    await nextTick()
    await vi.advanceTimersByTimeAsync(499)
    expect(geocode).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    await flush()
    expect(geocode).toHaveBeenCalledTimes(1)
    expect(geocode).toHaveBeenCalledWith('sant')
    expect(results.value).toHaveLength(1)
  })

  it('trims the query before counting characters', async () => {
    const q = ref('')
    useLocationSearch(q)
    q.value = ' ab '
    await nextTick()
    await vi.advanceTimersByTimeAsync(600)
    expect(geocode).not.toHaveBeenCalled()
  })

  it('clears results when the query drops below the minimum', async () => {
    const q = ref('')
    const { results } = useLocationSearch(q)
    q.value = 'santos'
    await nextTick()
    await vi.advanceTimersByTimeAsync(500)
    await flush()
    expect(results.value).toHaveLength(1)
    q.value = 'sa'
    await nextTick()
    expect(results.value).toHaveLength(0)
  })

  it('ignores stale responses', async () => {
    let resolveFirst!: (v: api.Location[]) => void
    geocode.mockImplementationOnce(() => new Promise((r) => (resolveFirst = r)))
    geocode.mockResolvedValueOnce([{ name: 'Second', latitude: 0, longitude: 0 }])
    const q = ref('')
    const { results } = useLocationSearch(q)
    q.value = 'first'
    await nextTick()
    await vi.advanceTimersByTimeAsync(500)
    q.value = 'second'
    await nextTick()
    await vi.advanceTimersByTimeAsync(500)
    await flush()
    resolveFirst([{ name: 'First', latitude: 0, longitude: 0 }])
    await flush()
    expect(results.value.map((r) => r.name)).toEqual(['Second'])
  })

  it('skip() suppresses the next search (used after picking a result)', async () => {
    const q = ref('')
    const { skipNext } = useLocationSearch(q)
    skipNext()
    q.value = 'Santos, SP'
    await nextTick()
    await vi.advanceTimersByTimeAsync(600)
    expect(geocode).not.toHaveBeenCalled()
  })
})
