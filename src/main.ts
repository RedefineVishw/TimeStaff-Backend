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
  app.enableCors({ origin: ['http://localhost:3000'], credentials: true });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 5000);
}
await bootstrap();
