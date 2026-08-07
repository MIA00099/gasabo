// Express 4 does not forward rejected promises from async route handlers to the
// error-handling middleware - an unhandled rejection there just hangs the request.
// This patches Router's HTTP verb methods so every handler's returned promise is
// caught and forwarded to next(err), without adding a new dependency.
import { Router } from 'express';

const verbs = ['get', 'post', 'put', 'patch', 'delete'] as const;
const proto: any = (Router as any).prototype ?? Object.getPrototypeOf(Router());

for (const verb of verbs) {
  const original = proto[verb];
  if (!original || original.__asyncWrapped) continue;

  proto[verb] = function (...args: any[]) {
    const wrapped = args.map((arg) =>
      typeof arg === 'function'
        ? function (this: any, req: any, res: any, next: any) {
            try {
              const result = arg.call(this, req, res, next);
              if (result && typeof result.catch === 'function') {
                result.catch(next);
              }
              return result;
            } catch (err) {
              next(err);
            }
          }
        : arg
    );
    return original.apply(this, wrapped);
  };
  proto[verb].__asyncWrapped = true;
}
