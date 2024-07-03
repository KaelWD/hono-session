import { expect, test, describe, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { createClient } from './setup'
import session from '../src'

test('Login flow', async () => {
  const app = new Hono()
    .use(session())
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
  const client = createClient(app)

  // Logging in
  const res1 = await client.get('/login')
  expect(res1.status).toBe(204)
  expect(res1.headers.getSetCookie()).toEqual([expect.stringMatching(/^sid=[^;]/)])

  // Retrieve session
  const res2 = await client.get('/user')
  expect(res2.status).toBe(200)
  expect(res2.headers.getSetCookie()).toHaveLength(0)
  expect(await res2.text()).toBe('123')

  // Logging out
  const res3 = await client.get('/logout')
  expect(res3.status).toBe(204)
  expect(res3.headers.getSetCookie()).toEqual([expect.stringContaining('sid=;')])
})

describe('Flash', () => {
  const app = new Hono()
    .use(session())
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
  let client = createClient(app)
  beforeEach(() => {
    client = createClient(app)
  })

  test('Set flash', async () => {
    const res1 = await client.get('/flash')
    expect(res1.status).toBe(204)
    expect(res1.headers.getSetCookie()).toEqual([expect.stringMatching(/^sid=[^;]/)])

    // Retrieve session
    const res2 = await client.get('/read-flash')
    expect(res2.status).toBe(200)
    expect(await res2.text()).toBe('bar')

    // Retrieve session again
    const res3 = await client.get('/read-flash')
    expect(res3.status).toBe(200)
    expect(await res3.text()).toBe('')
  })

  test('Reflash', async () => {
    await client.get('/flash')
    await client.get('/reflash')
    const res1 = await client.get('/read-flash')
    expect(res1.status).toBe(200)
    expect(await res1.text()).toBe('bar')
    const res2 = await client.get('/read-flash')
    expect(res2.status).toBe(200)
    expect(await res2.text()).toBe('')
  })
})

describe('Expiration', () => {
  const store = new Map()
  const app = new Hono()
    .use(session({ store }))
    .get('/login', c => {
      c.session.userId = '123'
      return c.text(c.session._expires.toString())
    })
    .get('/me', c => {
      if (!c.session.userId) return c.text('Unauthorised', 401)
      return c.text(c.session.userId)
    })
    .get('/expires', c => {
      c.session.userId = '456'
      return c.text(c.session._expires.toString())
    })
    .get('/renew', c => {
      c.session.renew()
      return c.text(c.session._expires.toString())
    })
  let client = createClient(app)
  beforeEach(() => {
    client = createClient(app)
  })

  test('Sessions expire', async () => {
    await client.get('/login')
    const sid = client.cookies.get('sid')
    store.set(sid, { _expires: Date.now() - 100, userId: '123' })
    const res = await client.get('/me')
    expect(res.status).toBe(401)
  })

  test('Renew', async () => {
    // Set expiry
    const res1 = await client.get('/login')
    const start = Number(await res1.text())

    // Expiry does not change
    await new Promise(resolve => setTimeout(resolve, 10))
    const res2 = await client.get('/expires')
    expect(Number(await res2.text())).toBe(start)

    // Renew
    await new Promise(resolve => setTimeout(resolve, 10))
    const res3 = await client.get('/renew')
    expect(Number(await res3.text())).toBeGreaterThan(start)
  })

  test('Renew expired session', async () => {
    await client.get('/login')
    const sid = client.cookies.get('sid')
    store.set(sid, { _expires: Date.now() - 100 })
    await client.get('/renew')
    expect(client.cookies.get('sid')).not.toBe(sid)
  })
})

test('Regenerate', async () => {
  const store = new Map()
  const app = new Hono()
    .use(session({ store }))
    .get('/login', c => {
      c.session.userId = '123'
      return c.body(null, 204)
    })
    .get('/regenerate', c => {
      c.session.regenerate()
      return c.body(null, 204)
    })
  const client = createClient(app)

  const res1 = await client.get('/login')
  const start = [...store.keys()]
  expect(start).toHaveLength(1)

  const res2 = await client.get('/regenerate')
  const end = [...store.keys()]
  expect(end).toHaveLength(1)

  expect(start).not.toBe(end)

  expect(res2.headers.getSetCookie()).toHaveLength(1)
  expect(res1.headers.getSetCookie()).not.toEqual(res2.headers.getSetCookie())
})
