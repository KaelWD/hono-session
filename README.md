# Hono-session

```js
import session from 'hono-session'

const app = new Hono()
  .use(session())
  .post('/login', async c => {
    c.session.userId = '...'
    // or
    const session = c.get('session')
    session.userId = '...'
  })
  .post('/logout', async c => {
    c.session = null
    // or
    c.set('session', null)
  })
  .get('/me', async c => {
    const userId = c.session.userId
    if (!userId) return c.text('Unauthorised', 401)
    return c.text(userId)
  })
```

### Middleware options

#### `maxAge: number` (default 1 day)

Session expiry in seconds.

#### `cookieName` (default "sid")

#### `cookieOptions` (default secure, httpOnly)

### Session properties

#### `renew(maxAge?: number)`

Update the session expiration.

#### `regenerate() => Promise`

Generate a new session ID. This should be called when a user logs in to prevent session fixation attacks. The old session entry will be deleted from the store, not overwritten.

#### `flash(key, value) => void`

Save a value to the session that will be removed after the next request.

#### `reflash() => void`

Persist flashed values for an additional request, useful for redirects.

#### `hasChanged: boolean`

If the session data has been modified since it was loaded.

#### `isNew: boolean`

If the session has not been saved yet.

## Stateless by default

Session data is encrypted and stored in the client's cookies, no database required.

```js
session({
  secret: '...', // Encryption key, must be at least 32 characters
  encoder: { // Custom encryption functions
    encode (data, secret) { /* object -> string */ },
    decode (data, secret) { /* string -> object */ },
  },
})
```

`secret` and `encoder` are both optional, [iron-webcrypto](https://github.com/brc-dd/iron-webcrypto) will be used by default.

If a secret is not provided then a random one will be generated and sessions will only be valid until the server restarts.

## External stores

Session data can also be saved into a file or database table, the cookie will be set to a random UUID.

```js
const databaseStore = { 
  async get (id, c) {
    return db.query('SELECT data FROM sessions WHERE id = $id', { id })
  },
  async set (id, data, c) {
    await db.query(
      'INSERT INTO sessions (id, data) VALUES ($id, $data) ON CONFLICT DO UPDATE SET data = $data',
      { id, data }
    )
  },
  async delete (id, c) {
    await db.query('DELETE FROM sessions WHERE id = $id', { id })
  },
}

session({
  store: databaseStore,
})
```

Hono context is available as the last argument if you need to store additional information like user agent or client IP address.

This is the same interface as js Maps, you can use a Map directly as an in-memory store:

```js
const memoryStore = new Map()

session({
  store: memoryStore,
})
```

## Typescript

If you only use sessions on specific routes, custom properties can be passed into the middleware as a generic argument:

```ts
app.use(
  session<{
    userId?: string
  }>()
)
```

For larger apps you probably want to set it globally instead:

```ts
import 'hono-session/global'

declare module 'hono-session' {
  export interface Session {
    userId?: string
  }
}
```

Custom middleware can also refine the session type:

```ts
import { createMiddleware } from 'hono/factory'

function verifySession () {
  return createMiddleware<{
    Variables: {
      user: User,
      Session: {
        userId: string
      }
    }
  }>(async (c, next) => {
    const userId = c.session.userId
    if (!userId) return c.text('Unauthorised', 401)

    const user = await getUser(userId)
    c.set('user', user)

    await next()
  })
}

app.get('/me', async c => {
  c.session.userId
  //        ^? string | undefined
})

app.get('/me', verifySession(), async c => {
  c.session.userId
  //        ^? string
  const user = c.get(user)
  return c.json(user)
})
```
