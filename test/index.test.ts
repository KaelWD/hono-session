import { expect, test, describe } from 'vitest'
import { Hono } from 'hono'
import { createClient } from './setup'
import session from '../src'

describe('Login session', () => {
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

  test('Logging in', async () => {
    const res = await client.get('/login')
    expect(res.status).toBe(204)
    expect(res.headers.getSetCookie()).toEqual([expect.stringMatching(/^sid=[^;]/)])
  })

  test('Retrieve session', async () => {
    const res = await client.get('/user')
    expect(res.status).toBe(200)
    expect(res.headers.getSetCookie()).toHaveLength(0)
    expect(await res.text()).toBe('123')
  })

  test('Logging out', async () => {
    const res = await client.get('/logout')
    expect(res.status).toBe(204)
    expect(res.headers.getSetCookie()).toEqual([expect.stringContaining('sid=;')])
  })
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
  const client = createClient(app)

  test('Set flash', async () => {
    const res = await client.get('/flash')
    expect(res.status).toBe(204)
    expect(res.headers.getSetCookie()).toEqual([expect.stringMatching(/^sid=[^;]/)])
  })

  test('Retrieve session', async () => {
    const res = await client.get('/read-flash')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('bar')
  })

  test('Retrieve session again', async () => {
    const res = await client.get('/read-flash')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('')
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
