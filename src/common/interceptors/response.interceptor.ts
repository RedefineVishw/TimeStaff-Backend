import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';

import { SUCCESS_MESSAGE_KEY } from '../decorators/success-message.decorator.js';

// The shape every successful response takes — matches what the frontend's
// apiRequest() already assumes (body.success / body.data).
export interface ApiResponse<T> {
    success: true;
    message?: string;
    data: T;
}

// Wraps whatever a controller returns — controllers stay unchanged, they
// just return plain data as normal; this runs on every request and wraps it.
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
    constructor(private readonly reflector: Reflector) { }
    intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T>> {
        const message = this.reflector.get<string>(SUCCESS_MESSAGE_KEY, context.getHandler());
        return next.handle().pipe(
            map((data) => ({
                success: true,
                message,
                data,
            })),
        );
    }
}