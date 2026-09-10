import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ResponseInterceptor } from './interceptors/response.interceptor.js';
import { HttpExceptionFilter } from './filters/http-exception.filter.js';

// Bundles every global, request-wide provider (interceptors, filters, and
// later guards) in one place, so AppModule just imports this instead of
// declaring raw providers inline.
@Module({
  providers: [
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class CommonModule {}
