import * as Iron from 'iron-webcrypto'
import { MaybePromise } from './utils'

export interface Encoder {
  encode: (data: Record<string, any>, secret: string) => MaybePromise<string>
  decode: (data: string, secret: string) => MaybePromise<Record<string, any> | null>
}

export const defaultEncoder = {
  encode (data, secret) {
    return Iron.seal(globalThis.crypto, data, secret, Iron.defaults)
  },
  decode (data, secret) {
    return Iron.unseal(globalThis.crypto, data, secret, Iron.defaults)
  },
} satisfies Encoder
