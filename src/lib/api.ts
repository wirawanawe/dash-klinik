export function getAuthToken(): string | null {
    if (typeof document === 'undefined') return null;
    const cookie = document.cookie
        .split('; ')
        .find((row) => row.startsWith('auth_token='));
    if (!cookie) return null;
    const eq = cookie.indexOf('=');
    return eq >= 0 ? cookie.slice(eq + 1) : null;
}

export function getApiHeaders(additional?: Record<string, string>): Record<string, string> {
    const token = getAuthToken();
    const headers: Record<string, string> = { ...additional };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
}
