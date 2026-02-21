const STORAGE_KEY = 'selected_dashboard_user_id';

export function getSelectedDashboardUserId(): string | null {
    if (typeof window === 'undefined') return null;
    try {
        return window.localStorage.getItem(STORAGE_KEY);
    } catch {
        return null;
    }
}

export function setSelectedDashboardUserId(id: string | null) {
    if (typeof window === 'undefined') return;
    try {
        if (id === null) {
            window.localStorage.removeItem(STORAGE_KEY);
        } else {
            window.localStorage.setItem(STORAGE_KEY, id);
        }
        window.dispatchEvent(new Event('tenant-change'));
    } catch {
        // ignore storage errors
    }
}

export function subscribeToTenantChange(callback: () => void) {
    if (typeof window === 'undefined') return () => { };
    const listener = () => callback();
    window.addEventListener('tenant-change', listener);
    return () => window.removeEventListener('tenant-change', listener);
}
