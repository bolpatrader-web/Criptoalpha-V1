/**
 * Safe API client for fetching and parsing JSON responses without crashing on HTML responses.
 */

export interface SafeFetchResult<T> {
  ok: boolean;
  data: T | null;
  status: number;
  error?: string;
}

export async function safeFetchJson<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<SafeFetchResult<T>> {
  try {
    const res = await fetch(input, init);
    const contentType = res.headers.get('content-type') || '';
    
    if (!res.ok) {
      return {
        ok: false,
        data: null,
        status: res.status,
        error: `HTTP ${res.status}: ${res.statusText}`,
      };
    }

    const text = await res.text();
    const trimmed = text.trim();

    // Check if the response is HTML rather than JSON
    if (trimmed.startsWith('<') || trimmed.toLowerCase().startsWith('<!doctype')) {
      return {
        ok: false,
        data: null,
        status: res.status,
        error: 'El servidor devolvió una respuesta HTML inesperada en lugar de JSON',
      };
    }

    if (!trimmed) {
      return {
        ok: true,
        data: null,
        status: res.status,
      };
    }

    try {
      const parsed = JSON.parse(trimmed) as T;
      return {
        ok: true,
        data: parsed,
        status: res.status,
      };
    } catch (parseError: any) {
      return {
        ok: false,
        data: null,
        status: res.status,
        error: `Error al procesar JSON: ${parseError?.message}`,
      };
    }
  } catch (netError: any) {
    return {
      ok: false,
      data: null,
      status: 0,
      error: netError?.message || 'Error de red o conexión',
    };
  }
}
