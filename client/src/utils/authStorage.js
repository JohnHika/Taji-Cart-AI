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