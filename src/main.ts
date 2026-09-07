import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    // Local dev origins only for now — the web dashboard (3001) and, later,
    // the Electron app's renderer. Tighten this to a real allowlist before
    // this ever leaves your machine.
    origin: ['http://localhost:3001'],
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
