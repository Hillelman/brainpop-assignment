<?php

use App\Exceptions\AppNotConfiguredException;
use App\Exceptions\DomainException;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Encryption\MissingAppKeyException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\UnauthorizedException;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\MethodNotAllowedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // The API is public and stateless; the framework's default api middleware group is all it needs.
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $wantsJson = fn (Request $request): bool => $request->is('api/*') || $request->expectsJson();

        $exceptions->shouldRenderJsonWhen($wantsJson);

        $exceptions->render(function (Throwable $e, Request $request) use ($wantsJson): ?JsonResponse {
            if (! $wantsJson($request)) {
                return null;
            }

            $error = fn (string $message, string $code, int $status, array $extra = [], array $headers = []): JsonResponse => response()->json(
                ['message' => $message, 'code' => $code, ...$extra],
                $status,
                $headers,
            );

            return match (true) {
                $e instanceof AppNotConfiguredException => $error($e->getMessage(), $e->errorCode, $e->status, ['errors' => ['missing' => $e->missing]]),
                $e instanceof MissingAppKeyException => $error('The application is not configured on the server.', 'app_not_configured', 503, ['errors' => ['missing' => ['APP_KEY']]]),
                $e instanceof DomainException => $error($e->getMessage(), $e->errorCode, $e->status),
                $e instanceof AuthenticationException,
                $e instanceof UnauthorizedException => $error('Unauthenticated.', 'unauthenticated', 401),
                $e instanceof AuthorizationException => $error('Forbidden.', 'forbidden', 403),
                $e instanceof ModelNotFoundException,
                $e instanceof NotFoundHttpException => $error('Not found.', 'not_found', 404),
                $e instanceof MethodNotAllowedHttpException => $error('Method not allowed.', 'method_not_allowed', 405, headers: $e->getHeaders()),
                $e instanceof ValidationException => $error('The given data was invalid.', 'validation_failed', 422, ['errors' => $e->errors()]),
                $e instanceof HttpExceptionInterface && $e->getStatusCode() === 429 => $error('Too many requests.', 'too_many_requests', 429, headers: $e->getHeaders()),
                $e instanceof HttpExceptionInterface => $error($e->getMessage() !== '' ? $e->getMessage() : 'Request failed.', 'http_error', $e->getStatusCode(), headers: $e->getHeaders()),
                default => $error(
                    'Server error',
                    'server_error',
                    500,
                    config('app.debug') && ! app()->environment('testing')
                        ? ['trace' => explode("\n", $e->getTraceAsString())]
                        : [],
                ),
            };
        });
    })->create();
