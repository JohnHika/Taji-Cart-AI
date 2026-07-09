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
};