import { createMiddleware } from 'hono/factory'
import { secondsInADay, type SessionOptions } from './utils'
import { SessionManager } from './SessionManager'
import { Session } from './Session'

export {
  Session,
  SessionManager,
  SessionOptions,
}

export default function<
  T extends Record<string, any> = {}
>(_options: SessionOptions) {
  if (!_options.store && !_options.encoder) {
    throw new Error('Either an encoder or a store are required')
  }
  const options = {
    autoCommit: true,
    maxAge: 1 * secondsInADay,
    cookieName: 'sid',
    cookieOptions: {},
    ..._options,
  } as Required<SessionOptions>
  options.cookieOptions.maxAge ??= options.maxAge

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
        get(key as any)
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
