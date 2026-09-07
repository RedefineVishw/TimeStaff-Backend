import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    // Dev only: allow any localhost port — the web dashboard (3001) and the
    // Electron renderer (Vite picks its own dev port, e.g. 5173) both need
    // this, and hardcoding one port breaks the moment the other changes.
    // Tighten to a real allowlist before this ever leaves your machine.
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin || /^http:\/\/localhost:\d+$/.test(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip any body fields not declared on the DTO
      transform: true, // turn plain JSON into actual DTO class instances
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
