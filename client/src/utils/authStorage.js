export const getRememberMe = () => {
    if (typeof window === 'undefined') {
        return false;
    }

    // Customer sessions persist by default. A customer can opt out on a shared device.
    return localStorage.getItem('rememberMe') !== 'false';
};

export const setRememberMe = (value) => {
    if (typeof window === 'undefined') {
        return;
    }

    localStorage.setItem('rememberMe', value ? 'true' : 'false');
};

// sessionStorage is per-tab, so a "remember me" session (which lives in both
// storages) reading sessionStorage first meant a token rotated by one tab
// was invisible to every other tab, which kept using its own stale
// sessionStorage copy until it diverged and 401'd unrecoverably. When
// remember-me is on, prefer the localStorage copy — shared across tabs —
// so every tab picks up the latest token on its very next request.
export const getStoredAccessToken = () => {
    if (typeof window === 'undefined') {
        return '';
    }

    if (getRememberMe()) {
        return (
            localStorage.getItem('accesstoken') ||
            sessionStorage.getItem('accesstoken') ||
            localStorage.getItem('token') ||
            sessionStorage.getItem('token') ||
            ''
        );
    }

    return (
        sessionStorage.getItem('accesstoken') ||
        sessionStorage.getItem('token') ||
        ''
    );
};

export const hasStoredAccessToken = () => Boolean(getStoredAccessToken());

// Network and server errors must not sign a customer out. Only a server-confirmed
// authentication rejection means the saved session is no longer usable.
export const isAuthSessionError = (error) => {
    const status = error?.response?.status;
    return status === 401 || status === 403;
};

export const getStoredRefreshToken = () => {
    if (typeof window === 'undefined') {
        return '';
    }

    if (getRememberMe()) {
        return (
            localStorage.getItem('refreshToken') ||
            sessionStorage.getItem('refreshToken') ||
            ''
        );
    }

    return sessionStorage.getItem('refreshToken') || '';
};

export const saveTokens = ({ accessToken, refreshToken, rememberMe }) => {
    if (typeof window === 'undefined') {
        return;
    }

    setRememberMe(rememberMe);

    if (rememberMe) {
        // Long-term persistence across browser restarts
        localStorage.setItem('accesstoken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        // Also keep in sessionStorage for the current tab/session
        sessionStorage.setItem('accesstoken', accessToken);
        sessionStorage.setItem('refreshToken', refreshToken);
    } else {
        // Session-only: clear any old long-term tokens
        sessionStorage.setItem('accesstoken', accessToken);
        sessionStorage.setItem('refreshToken', refreshToken);
        localStorage.removeItem('accesstoken');
        localStorage.removeItem('refreshToken');
    }
};

// Tokens are duplicated across sessionStorage and localStorage (so a session
// survives mobile tab kills) — logout must clear both or a leftover token in
// the other storage will silently restore the session on the next reload.
export const clearAuthStorage = () => {
    if (typeof window === 'undefined') {
        return;
    }

    sessionStorage.removeItem('accesstoken');
    sessionStorage.removeItem('refreshToken');
    sessionStorage.removeItem('token');
    localStorage.removeItem('accesstoken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('token');
    localStorage.removeItem('rememberMe');
};