import { Session } from './Session'

declare module 'hono' {
  interface ContextVariableMap {
    session: Session
  }
  interface Context<E> {
    get session (): 0 extends (1 & E)
      ? Session
      : E extends { Variables: { session: infer S } }
        ? S
        : Session
    set session (value: null)
  }
}
