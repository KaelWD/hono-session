import { debug } from './utils'
import { SessionManager } from './SessionManager'

export class Session {
  readonly #manager: SessionManager
  readonly #initialState: string
  #isNew: boolean
  #oldFlashKeys?: string[]

  _flashKeys?: string[]
  _expires: number

  constructor (manager: SessionManager, data?: Record<string, any> | null) {
    this.#manager = manager
    this._expires = Date.now() + manager.options.maxAge * 1000
    this.#isNew = !!data
    Object.assign(this, data)
    this.#initialState = JSON.stringify(this.toJSON())
    this.#oldFlashKeys = this._flashKeys
    this._flashKeys = undefined
  }

  get hasChanged (): boolean {
    return this.#initialState !== JSON.stringify(this.toJSON())
  }

  get isNew (): boolean {
    return this.#isNew
  }

  toJSON () {
    return Object.fromEntries(
      Object.entries(this)
        .filter(([_, value]) => !(
          value == null ||
          (Array.isArray(value)
            ? !value.length
            : typeof value === 'object' && !Object.keys(value).length)
        ))
    )
  }

  renew (maxAge?: number) {
    this._expires = Date.now() + (maxAge ?? this.#manager.options.maxAge) * 1000
  }

  async regenerate () {
    return this.#manager.regenerate()
  }

  /** Store a value in the session for only the next request */
  flash <T extends keyof this & string>(key: T, value: this[T]) {
    this[key] = value
    this._flashKeys ??= []
    if (!this._flashKeys.includes(key)) this._flashKeys.push(key)
    if (this.#oldFlashKeys) {
      const idx = this.#oldFlashKeys.indexOf(key)
      if (~idx) this.#oldFlashKeys.splice(idx, 1)
    }
  }

  /** Keep all flashed values for an extra request */
  reflash () {
    if (!this.#oldFlashKeys?.length) return
    debug('keeping flashed keys', this.#oldFlashKeys, 'and', this._flashKeys)
    const set = [...this.#oldFlashKeys]
    if (this._flashKeys?.length) set.push(...this._flashKeys)
    this._flashKeys = Array.from(new Set(set))
    this.#oldFlashKeys = undefined
  }

  /** Remove flashed values from the previous request */
  ageFlash () {
    debug('clearing flashed keys', this.#oldFlashKeys)
    this.#oldFlashKeys?.forEach(key => {
      (this as any)[key] = undefined
    })
    this.#oldFlashKeys = this._flashKeys
  }
}
