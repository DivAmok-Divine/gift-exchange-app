import { state } from '../wheel/state.js';
import { setOnWinnerCallback } from '../wheel/spin.js';
import { showToast } from '../ui/toast.js';
import { showPairedResult, resetWheel } from '../ui/result.js';
import { saveUserPassword } from '../../db/data.js';
import { getLoginBranding, getPasswordToggleHTML } from '../ui/branding.js';

/**
 * Returns the effective password for a user in priority order:
 *  1. localStorage override (admin/user changed it via "Change Password")
 *  2. Sheet Password column (if they filled it in the Google Form)
 *  3. Phone number fallback (default credential)
 */
export function getEffectivePassword(u) {
    return localStorage.getItem('passwordOverride_' + u.phone)
        || (u.password && u.password.trim() !== '' ? u.password : null)
        || u.phone;
}

/**
 * Bootstraps all login / logout / change-password functionality.
 */
export function initLogin(users) {
    // Wire spin result → paired card
    setOnWinnerCallback(showPairedResult);

    const loginContainer = document.getElementById('login-container');
    const appContainer = document.getElementById('app-container');

    // --- Render Login UI dynamically ---
    const userBox = document.getElementById('user-login-box');
    const adminBox = document.getElementById('admin-login-box');

    userBox.innerHTML = `
        ${getLoginBranding()}
        <h2 id="welcome-title" style="user-select: none; cursor: default;">Welcome</h2>
        <p>Please log in to spin the wheel</p>
        <input type="text" id="login-fname" placeholder="Username" />
        <div class="password-wrapper">
            <input type="password" id="login-phone" placeholder="Password" />
            <div id="toggle-user-pass">${getPasswordToggleHTML()}</div>
        </div>
        <button id="login-btn" class="btn login-submit-btn">Login</button>
        <p id="login-error" class="hidden error-text">Invalid username or password.</p>
    `;

    adminBox.innerHTML = `
        ${getLoginBranding()}
        <h2>Admin Area</h2>
        <p>Enter admin credentials.</p>
        <input type="text" id="admin-username" placeholder="Username" />
        <div class="password-wrapper">
            <input type="password" id="admin-password" placeholder="Password" />
            <div id="toggle-admin-pass">${getPasswordToggleHTML()}</div>
        </div>
        <button id="admin-login-btn" class="btn login-submit-btn">Login as Admin</button>
        <p id="admin-error" class="hidden error-text">Invalid credentials.</p>
        <p id="user-toggle" class="admin-toggle" style="margin-top:20px; color:#a4b0be; cursor:pointer;">Go back to User Login</p>
    `;

    const loginBtn = document.getElementById('login-btn');
    const loginFname = document.getElementById('login-fname');
    const loginPhone = document.getElementById('login-phone');
    const loginError = document.getElementById('login-error');

    function showApp(matchedUser) {
        state.currentUser = matchedUser;
        loginContainer.classList.add('hidden');
        appContainer.classList.remove('hidden');
        document.getElementById('user-greeting').innerHTML = `<svg class="icon-inline" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg> ${matchedUser.fullName}`;

        let savedPairObj = null;

        // --- Master Sync Priority ---
        // 1. Check if the Master Google Sheet says this user is paired
        if (matchedUser.pairedWith) {
            const pairedPerson = users.find(u => u.cleanPhone === matchedUser.pairedWith);
            if (pairedPerson) {
                savedPairObj = pairedPerson;
                // Update local storage to match the truth on the sheet
                localStorage.setItem('pairedUser_' + matchedUser.phone, JSON.stringify(pairedPerson));
            } else {
                // If the phone number on sheet doesn't match any known user, treat as unpaired
                localStorage.removeItem('pairedUser_' + matchedUser.phone);
            }
        } 
        // 2. If the sheet says NOT paired, but we have a local result, CLEAR IT (it's stale/incorrect)
        else {
            localStorage.removeItem('pairedUser_' + matchedUser.phone);
            savedPairObj = null;
        }

        if (savedPairObj) {
            showPairedResult(savedPairObj);
        } else {
            resetWheel();
        }
    }

    // --- Auto-restore session (keyed by original phone, always stable) ---
    function checkLogin() {
        const savedPhone = localStorage.getItem('loggedInUserPhone');
        if (savedPhone) {
            const matchedUser = users.find(u => u.phone === savedPhone);
            if (matchedUser) showApp(matchedUser);
        }
    }
    checkLogin();

    // --- Login ---
    const loginAction = () => {
        const fname = loginFname.value.trim().toLowerCase();
        const inputPassword = loginPhone.value.trim();

        const matchedUser = users.find(u => {
            const uFirstName = u.fullName.split(' ')[0].toLowerCase();
            const effectivePassword = getEffectivePassword(u);
            return uFirstName === fname && effectivePassword === inputPassword;
        });

        if (matchedUser) {
            localStorage.setItem('loggedInUserPhone', matchedUser.phone);
            showToast('Login successful! Welcome ' + matchedUser.fullName);
            loginError.classList.add('hidden');
            showApp(matchedUser);
        } else {
            loginError.classList.remove('hidden');
        }
    };

    loginBtn.addEventListener('click', loginAction);

    [loginFname, loginPhone].forEach(input => {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') loginAction();
        });
    });

    // --- Password visibility toggle ---
    const toggleUserPass = document.getElementById('toggle-user-pass');
    toggleUserPass.addEventListener('click', () => {
        const type = loginPhone.getAttribute('type') === 'password' ? 'text' : 'password';
        loginPhone.setAttribute('type', type);

        toggleUserPass.querySelector('.eye-open').classList.toggle('hidden', type !== 'password');
        toggleUserPass.querySelector('.eye-closed').classList.toggle('hidden', type === 'password');
    });

    // --- Logout ---
    document.getElementById('logout-btn').addEventListener('click', () => {
        localStorage.removeItem('loggedInUserPhone');
        state.currentUser = null;
        loginFname.value = '';
        loginPhone.value = '';
        loginError.classList.add('hidden');
        appContainer.classList.add('hidden');
        loginContainer.classList.remove('hidden');
    });

    // --- User self-service Change Password ---
    document.getElementById('change-password-btn').addEventListener('click', () => {
        if (!state.currentUser) return;
        const currentPass = getEffectivePassword(state.currentUser);
        openChangePasswordModal(
            state.currentUser.phone,
            'Change your password',
            currentPass,
            async (newPassword) => {
                localStorage.setItem('passwordOverride_' + state.currentUser.phone, newPassword);
                showToast('Password updated locally! Syncing to sheet...');

                const success = await saveUserPassword(state.currentUser.phone, newPassword);
                if (success) {
                    showToast('Success! Password saved to your account.');
                } else {
                    showToast('Warning: Sync to sheet failed (saved locally).');
                }

                showAppAlert(
                    "Password Changed Successfully", 
                    "You will now be logged out. Please log in again using your new password.",
                    () => { document.getElementById('logout-btn').click(); }
                );
            }
        );
    });

    // --- Play for Fun (Test Mode) ---
    const testToggle = document.getElementById('test-mode-toggle');
    if (testToggle) {
        testToggle.addEventListener('change', (e) => {
            state.testMode = e.target.checked;
            if (state.testMode) {
                showToast('Test mode on: Wheel unlocked.');
                resetWheel(); // Instantly unlock the wheel if they had already spun
            } else {
                showToast('Test mode off: Syncing to master data...');
                // Re-sync to see if they should be locked again
                if (state.currentUser) {
                    initLogin(users); // This will re-trigger checkLogin/showApp
                    location.reload(); // Simple way to re-enforce the actual state
                }
            }
        });
    }
}

/**
 * Shows a beautifully styled custom alert modal instead of browser default.
 */
export function showAppAlert(title, message, onOk, onNo) {
    const overlay = document.getElementById('alert-overlay');
    const okBtn = document.getElementById('alert-ok-btn');
    const noBtn = document.getElementById('alert-no-btn');
    const editBtn = document.getElementById('alert-edit-btn');
    const closeBtn = document.getElementById('alert-close-btn');

    document.getElementById('alert-title').innerText = title;
    document.getElementById('alert-message').innerText = message;
    
    // Default visibility
    editBtn.classList.add('hidden');
    
    if (onNo) {
        okBtn.innerText = "Yes";
        noBtn.innerText = "No";
        noBtn.classList.remove('hidden');
    } else {
        okBtn.innerText = "Close";
        noBtn.classList.add('hidden');
    }

    overlay.classList.remove('hidden');

    okBtn.onclick = () => {
        overlay.classList.add('hidden');
        if (onOk) onOk();
    };

    noBtn.onclick = () => {
        overlay.classList.add('hidden');
        if (onNo) onNo();
    };

    closeBtn.onclick = () => {
        overlay.classList.add('hidden');
    };
}

/**
 * Opens the shared change-password modal.
 * onSave(newPassword) is called when a valid input is saved.
 * Exported so admin.js can reuse it.
 */
export function openChangePasswordModal(userPhone, title, currentPassword, onSave) {
    const overlay = document.getElementById('change-phone-overlay');
    const input = document.getElementById('new-phone-input');
    const errEl = document.getElementById('change-phone-error');
    const toggle = document.getElementById('toggle-modal-pass');

    document.getElementById('change-phone-title').innerText = title;
    input.value = localStorage.getItem('passwordOverride_' + userPhone) || '';

    // Reset toggle state to hidden every time modal opens
    input.setAttribute('type', 'password');
    toggle.querySelector('.eye-open').classList.remove('hidden');
    toggle.querySelector('.eye-closed').classList.add('hidden');

    errEl.classList.add('hidden');
    overlay.classList.remove('hidden');

    toggle.onclick = () => {
        const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
        input.setAttribute('type', type);
        toggle.querySelector('.eye-open').classList.toggle('hidden', type !== 'password');
        toggle.querySelector('.eye-closed').classList.toggle('hidden', type === 'password');
    };

    document.getElementById('change-phone-save').onclick = () => {
        const newPassword = input.value.trim();
        
        if (!newPassword || newPassword.length < 4) {
            errEl.innerText = "Please enter a valid password (min. 4 characters).";
            errEl.classList.remove('hidden');
            return;
        }

        if (newPassword === currentPassword) {
            errEl.innerText = "Please choose a different password. This is already your current password.";
            errEl.classList.remove('hidden');
            return;
        }

        overlay.classList.add('hidden');
        onSave(newPassword);
    };

    document.getElementById('change-phone-cancel').onclick = () => {
        overlay.classList.add('hidden');
    };
}
