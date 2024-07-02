import { Hono } from 'hono'

export function createClient (app: Hono<any>) {
  const cookies = new Map<string, string>()
  return {
    async get (path: string, init?: RequestInit) {
      const res = await app.request(path, {
        ...init,
        headers: {
          ...init?.headers,
          Cookie: [...cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; '),
        },
      })
      res.headers.getSetCookie().forEach(cookie => {
        const [key, value] = cookie.split(';', 1).join().split('=')
        if (!value) cookies.delete(key)
        else cookies.set(key, value)
      })
      return res
    },
  }
}
