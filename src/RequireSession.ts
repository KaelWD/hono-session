import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

/**
 * Middleware that requires a session on a group of endpoints.
 * @param opts Provide a custom status code or message.
 * @throws {HTTPException} Throws an exception if the session isn't initialized or if no data has been added to the session.
 */
export function requireSession(
  opts: { statusCode?: ContentfulStatusCode; message?: string } = {}
) {
  return createMiddleware(async (c, next) => {
    const session = c.get('session');

    // Check if a session has been initialized and that some state has been set for the session.
    if (!session || Object.keys(session).filter((k) => !k.startsWith('_')).length < 1) {
      throw new HTTPException(opts.statusCode || 401, {
        message: opts.message || 'Unauthorized',
      });
    }

    // Renew the session
    session.renew();

    await next();
  });
}
