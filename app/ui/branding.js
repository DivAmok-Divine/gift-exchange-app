/**
 * Component responsible for rendering the branding header on login boxes.
 */
export function getLoginBranding() {
    return `
        <div class="login-brand" style="display: flex; flex-direction: column; align-items: center; gap: 12px; margin-bottom: 25px;">
            <img src="media/ABMinistry.jpeg" alt="AB Ministry Logo" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 2px solid var(--secondary-color);">
            <h1 style="font-size: 1.6rem; color: var(--secondary-color); margin: 0; font-weight: 800; letter-spacing: 0.5px;">Akosua Betty Ministries</h1>
        </div>
    `;
}

/**
 * Renders the password field toggle UI.
 */
export function getPasswordToggleHTML() {
    return `
        <div class="toggle-password">
            <svg class="eye-open" viewBox="0 0 24 24" width="18" height="18" stroke="currentColor"
                stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
            </svg>
            <svg class="eye-closed hidden" viewBox="0 0 24 24" width="18" height="18" stroke="currentColor"
                stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                <line x1="1" y1="1" x2="23" y2="23"></line>
            </svg>
        </div>
    `;
}
