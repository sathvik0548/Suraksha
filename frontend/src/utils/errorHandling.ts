/**
 * Error handling utilities for the Sentinel AI System
 */

export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public endpoint?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export class AuthenticationError extends Error {
  constructor(message: string = 'Authentication failed') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class NetworkError extends Error {
  constructor(message: string = 'Network request failed') {
    super(message);
    this.name = 'NetworkError';
  }
}

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Resolves endpoint path to target backend URL
 */
export function getApiUrl(endpoint: string): string {
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }

  const envUrl = import.meta.env.VITE_API_BASE_URL || '';
  const baseUrl = envUrl.trim()
    ? envUrl.replace(/\/+$/, '')
    : typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:8000'
    : '';

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return baseUrl ? `${baseUrl}${cleanEndpoint}` : cleanEndpoint;
}

/**
 * Enhanced fetch wrapper with error handling, URL resolution, and auto 401 handling
 */
export async function safeFetch(
  url: string,
  options: RequestInit = {},
  retries: number = 3
): Promise<Response> {
  const fullUrl = getApiUrl(url);
  const token = localStorage.getItem('auth_token');
  const isFormData = options.body instanceof FormData;

  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let lastError: Error | null = null;

  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(fullUrl, { ...options, headers });

      // Handle 401 Unauthorized
      if (response.status === 401) {
        console.warn('Token expired or invalid');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        throw new AuthenticationError('Session expired. Please login again.');
      }

      if (!response.ok) {
        let detailMsg = `HTTP ${response.status}: ${response.statusText}`;
        const contentType = response.headers.get('content-type') || '';

        if (contentType.includes('application/json')) {
          try {
            const errorData = await response.json();
            detailMsg = errorData.detail || errorData.message || detailMsg;
          } catch {
            // fallback
          }
        } else {
          detailMsg = `Server returned ${response.status} (${response.statusText}). Make sure backend API is running.`;
        }

        throw new APIError(detailMsg, response.status, fullUrl);
      }

      return response;
    } catch (error) {
      lastError = error as Error;

      if (error instanceof APIError && error.statusCode >= 400 && error.statusCode < 500 && error.statusCode !== 401) {
        throw error;
      }

      if (error instanceof AuthenticationError) {
        throw error;
      }

      if (i < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }

  throw lastError || new NetworkError();
}

/**
 * Error boundary component wrapper
 */
export function handleAsyncError<T>(
  promise: Promise<T>,
  onError?: (error: Error) => void
): Promise<T | null> {
  return promise.catch((error: Error) => {
    console.error('Async error:', error);
    onError?.(error);
    return null;
  });
}

/**
 * Parse error response from backend
 */
export function parseErrorResponse(response: any): string {
  if (typeof response === 'string') return response;
  if (response?.detail) return response.detail;
  if (response?.message) return response.message;
  if (response?.error) return response.error;
  return 'An unexpected error occurred';
}

/**
 * User-friendly error messages
 */
export function getUserFriendlyError(error: Error): string {
  if (error instanceof APIError) {
    switch (error.statusCode) {
      case 401:
        return 'Session expired. Please login again.';
      case 403:
        return "You don't have permission to perform this action";
      case 404:
        return 'The requested resource was not found';
      case 429:
        return 'Too many requests. Please try again later';
      case 500:
        return 'Server error. Please try again later';
      default:
        return error.message;
    }
  }

  if (error instanceof AuthenticationError) {
    return error.message;
  }

  if (error instanceof NetworkError) {
    return 'Network error. Please check your connection';
  }

  if (error instanceof ValidationError) {
    return `Validation error: ${error.message}`;
  }

  return 'An unexpected error occurred. Please try again';
}
