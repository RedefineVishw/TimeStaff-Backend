import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import type { Response } from 'express';

// Catches everything thrown anywhere in the app and reshapes it into the
// { success: false, message, errors } envelope — the counterpart to
// ResponseInterceptor for the failure path.
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();

      // Nest's built-in exceptions respond with either a plain string or
      // { statusCode, message, error } — message is a string[] specifically
      // for ValidationPipe failures, a single string for everything else.
      const isObjectBody = typeof body === 'object' && body !== null;
      const rawMessage = isObjectBody ? (body as { message?: unknown }).message : body;
      const isValidationError = Array.isArray(rawMessage);

      response.status(status).json({
        success: false,
        message: isValidationError ? 'Validation failed' : String(rawMessage ?? exception.message),
        errors: isValidationError ? rawMessage : undefined,
      });
      return;
    }

    // Anything that wasn't deliberately thrown as an HttpException — log
    // the real error server-side, but never leak it to the client.
    console.error(exception);
    response.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}
