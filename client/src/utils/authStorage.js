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

    return localStorage.getItem('rememberMe') === 'true';
};

export const setRememberMe = (value) => {
    if (typeof window === 'undefined') {
        return;
    }

    if (value) {
        localStorage.setItem('rememberMe', 'true');
    } else {
        localStorage.removeItem('rememberMe');
    }
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