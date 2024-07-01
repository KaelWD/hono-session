import { expect, test, describe } from 'vitest'
import { Hono } from 'hono'
import session from '../src'

const MemoryStore = new Map()

export const app = new Hono()
  .use(session<{
    userId?: string
    foo?: string
  }>({
    store: MemoryStore,
    encoder: {
      encode: (value) => JSON.stringify(value),
      decode: (value: string) => JSON.parse(value),
    },
  }))
  .get('/login', c => {
    c.session.userId = '123'
    return c.body(null, 204)
  })
  .get('/user', c => {
    return c.body(c.session.userId)
  })
  .get('/logout', c => {
    c.session = null
    return c.body(null, 204)
  })
  .get('/flash', c => {
    c.session.flash('foo', 'bar')
    return c.body(null, 204)
  })
  .get('/reflash', c => {
    c.session.reflash()
    return c.body(null, 204)
  })
  .get('/read-flash', c => {
    return c.body(c.session.foo)
  })

describe('Login session', () => {
  let Cookie: string[]
  test('Logging in', async () => {
    const res = await app.request('/login')
    expect(res.status).toBe(204)
    Cookie = res.headers.getSetCookie()
    expect(Cookie).toEqual([expect.stringMatching(/^sid=[^;]/)])
  })

  test('Retrieve session', async () => {
    const res = await app.request('/user', {
      headers: { Cookie },
    })
    expect(res.status).toBe(200)
    expect(res.headers.getSetCookie()).toHaveLength(0)
    expect(await res.text()).toBe('123')
  })

  test('Logging out', async () => {
    const res = await app.request('/logout', {
      headers: { Cookie },
    })
    expect(res.status).toBe(204)
    expect(res.headers.getSetCookie()).toEqual([expect.stringContaining('sid=;')])
  })
})

describe('Flash', () => {
  let Cookie: string[]
  test('Set flash', async () => {
    const res = await app.request('/flash')
    expect(res.status).toBe(204)
    Cookie = res.headers.getSetCookie()
    expect(Cookie).toEqual([expect.stringMatching(/^sid=[^;]/)])
  })

  test('Retrieve session', async () => {
    const res = await app.request('/read-flash', {
      headers: { Cookie },
    })
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('bar')
  })

  test('Retrieve session again', async () => {
    const res = await app.request('/read-flash', {
      headers: { Cookie },
    })
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('')
  })

  test('Reflash', async () => {
    await app.request('/flash', {
      headers: { Cookie },
    })
    await app.request('/reflash', {
      headers: { Cookie },
    })
    console.log(MemoryStore)
    const res1 = await app.request('/read-flash', {
      headers: { Cookie },
    })
    expect(res1.status).toBe(200)
    expect(await res1.text()).toBe('bar')
    const res2 = await app.request('/read-flash', {
      headers: { Cookie },
    })
    expect(res2.status).toBe(200)
    expect(await res2.text()).toBe('')
  })
})
