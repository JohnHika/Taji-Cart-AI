export const getStoredAccessToken = () => {
    if (typeof window === 'undefined') {
        return '';
    }

    return (
        sessionStorage.getItem('accesstoken') ||
        localStorage.getItem('accesstoken') ||
        sessionStorage.getItem('token') ||
        localStorage.getItem('token') ||
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

    return (
        sessionStorage.getItem('refreshToken') ||
        localStorage.getItem('refreshToken') ||
        ''
    );
};

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