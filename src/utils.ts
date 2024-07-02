import _debug from 'debug'
import type { CookieOptions } from 'hono/utils/cookie'
import type { Context } from 'hono'
import type { Encoder } from './Encoder'

export const debug = _debug('hono-session')

export const secondsInADay = 24 * 60 * 60

export interface SessionOptions {
  store?: SessionStore | null
  encoder?: Encoder | null
  secret?: string
  autoCommit?: boolean
  maxAge?: number
  cookieName?: string
  cookieOptions?: CookieOptions
}

export type MaybePromise<T> = T | Promise<T>

export interface SessionStore {
  get: (sid: string, c: Context) => MaybePromise<Record<string, any> | null | undefined>
  set: (sid: string, data: Record<string, any>, c: Context) => MaybePromise<unknown>
  delete: (sid: string, c: Context) => MaybePromise<unknown>
}
