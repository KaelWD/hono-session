import { createMiddleware } from 'hono/factory'
import { secondsInADay } from './utils'
import { SessionManager } from './SessionManager'
import { defaultEncoder } from './Encoder'
import type { Session } from './Session'
import type { SessionStore, SessionOptions } from './utils'

export type {
  Session,
  SessionManager,
  SessionOptions,
  SessionStore,
}

export default function<
  T extends Record<string, any>
>(_options?: SessionOptions) {
  const options = {
    encoder: defaultEncoder,
    maxAge: 1 * secondsInADay,
    cookieName: 'sid',
    existsCookieName: 'sx',
    ..._options,
    cookieOptions: {
      secure: true,
      httpOnly: true,
      ..._options?.cookieOptions,
    },
  } as Required<SessionOptions>
  options.cookieOptions.maxAge ??= options.maxAge
  options.secret ??= String.fromCodePoint(...globalThis.crypto.getRandomValues(new Uint8Array(32)))

  return createMiddleware<{
    Variables: { session: Session & T }
  }>(async (c, next) => {
    const manager = new SessionManager(options, c)
    if (options.store) await manager.initFromStore()
    else await manager.initFromCookie()

    Object.defineProperty(c, 'session', {
      get: () => manager.get(),
      set: (value: any) => {
        manager.set(value)
      },
      enumerable: true,
      configurable: true,
    })
    const get = c.get
    const set = c.set
    Object.defineProperty(c, 'get', {
      value: (key: string) => {
        if (key === 'session') {
          return manager.get()
        }
        return get(key as any)
      },
      enumerable: true,
      configurable: true,
    })
    Object.defineProperty(c, 'set', {
      value: (key: string, value: any) => {
        if (key === 'session') {
          manager.set(value)
          return
        }
        set(key as any, value)
      },
      enumerable: true,
      configurable: true,
    })

    try {
      await next()
    } finally {
      await manager.commit()
    }
  })
}
