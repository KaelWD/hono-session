import { SessionOptions, debug } from './utils'
import { Session } from './Session'
import { Context } from 'hono'
import { getCookie } from 'hono/cookie'
import { deleteCookie, setCookie } from 'hono/cookie'

export class SessionManager {
  session?: Session | false
  sessionKey?: string
  forceCommit = false

  constructor (
    public options: Required<SessionOptions>,
    public ctx: Context
  ) {}

  get () {
    debug('get', this.session)
    const session = this.session
    if (session) return session
    if (session === false) return null
    this.create()
    return this.session
  }

  set (value: any) {
    debug('set', value)
    if (value == null) {
      this.session = false
    } else if (typeof value === 'object') {
      this.create(value, this.sessionKey)
    } else {
      throw new TypeError('Session can only be set to an object or null')
    }
  }

  create (data?: any, sessionKey?: string) {
    debug('create session with data', data, 'key', sessionKey)
    const expires = data?._expires
    if (typeof expires === 'number' && expires < Date.now()) {
      data = undefined
      sessionKey = undefined
    }
    this.session = data instanceof Session ? data : new Session(this, data)
    if (this.options.store) this.sessionKey = sessionKey || globalThis.crypto.randomUUID()
  }

  async initFromStore () {
    if (!this.options.store) return

    const key = getCookie(this.ctx, this.options.cookieName)

    if (!key) {
      this.create()
      return
    }

    const data = await this.options.store.get(key, this.ctx)

    this.create(data, key)
  }

  async initFromCookie () {
    if (!this.options.encoder) return

    const decode = this.options.encoder.decode

    const cookie = getCookie(this.ctx, this.options.cookieName)

    if (!cookie) {
      this.create()
      return
    }

    let data
    try {
      data = await decode(cookie, this.options.secret)
    } catch (err) {
      this.create()
    }

    this.create(data)
  }

  async regenerate () {
    const session = this.session
    this.session = false
    await this.commit()
    this.create(session)
    this.forceCommit = true
    return this.session as any as Session
  }

  async commit () {
    const existsCookieOptions = {
      ...this.options.cookieOptions,
      ...this.options.existsCookieOptions,
      httpOnly: false,
    }

    if (!this.session) {
      if (this.session === false) {
        debug('removing session', this.sessionKey)
        if (this.options.store) await this.options.store.delete(this.sessionKey!, this.ctx)
        deleteCookie(this.ctx, this.options.cookieName, this.options.cookieOptions)
        deleteCookie(this.ctx, this.options.existsCookieName, existsCookieOptions)
      }
      return
    }

    this.session.ageFlash()
    if (!this.session.hasChanged && !this.forceCommit) {
      debug('session has not been changed')
      return
    }

    if (this.options.store) {
      debug('saving to store', this.sessionKey)
      await this.options.store.set(this.sessionKey!, this.session.toJSON(), this.ctx)
      setCookie(this.ctx, this.options.cookieName, this.sessionKey!, this.options.cookieOptions)
      setCookie(this.ctx, this.options.existsCookieName, '1', existsCookieOptions)
    } else {
      debug('saving to cookie')
      const encode = this.options.encoder!.encode
      setCookie(
        this.ctx,
        this.options.cookieName,
        await encode(this.session.toJSON(), this.options.secret),
        this.options.cookieOptions
      )
      setCookie(this.ctx, this.options.existsCookieName, '1', existsCookieOptions)
    }
  }
}
