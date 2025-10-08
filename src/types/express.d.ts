import 'express-serve-static-core';

declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      userId: number;
      jti?: string;
      email?: string;
      roles?: string | string[]; // <-- add this so RolesGuard can read roles
    };
  }
}
