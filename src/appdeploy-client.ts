/**
 * Vercel/local-build adapter for the AppDeploy-injected client.
 *
 * AppDeploy provides the real @appdeploy/client at its own runtime. This
 * adapter exists only for standalone Vercel builds so Rollup can resolve the
 * import. API calls use standard fetch; auth is deliberately unavailable here
 * until a real identity provider is configured (never fabricate a session).
 */
export type AuthUser = {
  userId?: string;
  email?: string;
  name?: string;
};

type ApiResult<T = unknown> = { data: T; status: number };

async function request<T = unknown>(method: string, path: string, body?: unknown): Promise<ApiResult<T>> {
  const response = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers: body === undefined ? { Accept: 'application/json' } : {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof data?.error === 'string' ? data.error : `Request failed (${response.status})`;
    throw new Error(message);
  }
  return { data: data as T, status: response.status };
}

export const api = {
  get: <T = unknown>(path: string) => request<T>('GET', path),
  post: <T = unknown>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T = unknown>(path: string, body?: unknown) => request<T>('PUT', path, body),
  patch: <T = unknown>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  delete: <T = unknown>(path: string, body?: unknown) => request<T>('DELETE', path, body),
};

export const auth = {
  async getUser(): Promise<AuthUser | null> {
    return null;
  },
  async signIn(): Promise<never> {
    throw new Error('Authentication is not configured for the standalone Vercel build. Use the AppDeploy runtime or configure a real identity provider.');
  },
  async signOut(): Promise<void> {
    // No standalone session exists to sign out.
  },
};

type SocketLike = {
  connectionId?: string;
  ready: Promise<void>;
  onMessage: (callback: (message: unknown) => void) => void;
  disconnect: () => void;
};

export const ws = {
  connect(): SocketLike {
    return {
      ready: Promise.reject(new Error('Live account updates require the AppDeploy runtime.')),
      onMessage: () => undefined,
      disconnect: () => undefined,
    };
  },
};
