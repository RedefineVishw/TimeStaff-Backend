import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // The refresh token lives in an httpOnly cookie — needs cookie-parser to
  // read it, and `credentials: true` so the browser actually sends/accepts
  // cookies on cross-origin requests (frontend on :3000, backend on :5000).
  app.use(cookieParser());
  app.enableCors({
    // The desktop app's renderer also makes fetch/XHR calls and is subject
    // to CORS like a browser tab — its origin is the Vite dev server in dev
    // (http://localhost:5173 by default) and effectively none/"null" once
    // packaged and loaded from a file:// URL, which shows up here as an
    // undefined origin. Requests with no Origin header at all (native HTTP
    // clients, curl, the desktop app's main process) always bypass CORS
    // regardless of this list — this only affects renderer-process fetches.
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      const allowed = origin === undefined || origin === 'http://localhost:3000' || origin === 'http://localhost:5173';
      callback(null, allowed);
    },
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 5000);
}
await bootstrap();
