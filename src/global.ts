import { Session } from './Session'

declare module 'hono' {
  interface ContextVariableMap {
    session: Session
  }
}

declare module './index' {
  namespace HonoSession {
    export interface isGlobal {
      enabled: true
    }
  }
}
