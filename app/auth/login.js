import { state } from '../wheel/state.js';
import { setOnWinnerCallback } from '../wheel/spin.js';
import { showToast } from '../ui/toast.js';
import { showPairedResult, resetWheel } from '../ui/result.js';
import { saveMemberPassword } from '../../db/data.js';
import { getLoginBranding, getPasswordToggleHTML } from '../ui/branding.js';

/**
 * Returns the effective password for a user in priority order:
 *  1. Sheet Password column (if they filled it in the Google Form)
 *  2. Phone number fallback (default credential)
 */
export function getEffectivePassword(u) {
    return (u.password && u.password.trim() !== '' ? u.password : null)
        || u.phone;
}

/**
 * Bootstraps all login / logout / change-password functionality.
 */
export function initLogin(users) {
    // --- Force-clear any legacy storage (strict statelessness) ---
    const sessionKeys = ['logged_user_phone', 'logged_admin_user'];

    // Clear EVERYTHING from localStorage permanently
    localStorage.clear();

    // Clear everything from sessionStorage EXCEPT our active login keys
    Object.keys(sessionStorage).forEach(key => {
        if (!sessionKeys.includes(key)) {
            sessionStorage.removeItem(key);
        }
    });

    // Also reset any checkbox states the browser might have cached/remembered
    const testToggle = document.getElementById('test-mode-toggle');
    if (testToggle) {
        testToggle.checked = false;
        state.testMode = false;
    }

    // Wire spin result → paired card
    setOnWinnerCallback(showPairedResult);

    const loginContainer = document.getElementById('login-container');
    const appContainer = document.getElementById('app-container');

    // --- Render Login UI dynamically ---
    const userBox = document.getElementById('member-login-box');
    const adminBox = document.getElementById('admin-login-box');

    userBox.innerHTML = `
        ${getLoginBranding()}
        <h2 id="welcome-title" style="user-select: none; cursor: default;">Welcome</h2>
        <p>Please log in to spin the wheel</p>
        <input type="text" id="login-fname" placeholder="Username" autocomplete="off" />
        <div class="password-wrapper">
            <input type="password" id="login-phone" placeholder="Password" autocomplete="new-password" />
            <div id="toggle-member-pass">${getPasswordToggleHTML()}</div>
        </div>
        <button id="login-btn" class="btn login-submit-btn">Login</button>
        <p id="login-error" class="hidden error-text">Invalid username or password.</p>
    `;

    adminBox.innerHTML = `
        ${getLoginBranding()}
        <h2>Admin Area</h2>
        <p>Enter admin credentials.</p>
        <input type="text" id="admin-username" placeholder="Username" autocomplete="off" />
        <div class="password-wrapper">
            <input type="password" id="admin-password" placeholder="Password" autocomplete="new-password" />
            <div id="toggle-admin-pass">${getPasswordToggleHTML()}</div>
        </div>
        <button id="admin-login-btn" class="btn login-submit-btn">Login as Admin</button>
        <p id="admin-error" class="hidden error-text">Invalid credentials.</p>
        <p id="member-toggle" class="admin-toggle" style="margin-top:20px; color:#a4b0be; cursor:pointer;">Go back to Member Login</p>
    `;

    const loginBtn = document.getElementById('login-btn');
    const loginFname = document.getElementById('login-fname');
    const loginPhone = document.getElementById('login-phone');
    const loginError = document.getElementById('login-error');

    function showApp(matchedUser) {
        state.currentMember = matchedUser;
        loginContainer.classList.add('hidden');
        appContainer.classList.remove('hidden');
        window.scrollTo(0, 0); // Snap to top after login
        document.getElementById('member-greeting').innerHTML = `<svg class="icon-inline" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg> ${matchedUser.fullName}`;

        let savedPairObj = null;

        // --- Master Sync Priority ---
        // 1. Check if the Master Google Sheet says this user is paired
        if (matchedUser.pairedWith) {
            const pairedPerson = users.find(u => u.cleanPhone === matchedUser.pairedWith);
            if (pairedPerson) {
                savedPairObj = pairedPerson;
            }
        }
        else {
            savedPairObj = null;
        }

        if (savedPairObj) {
            showPairedResult(savedPairObj);
        } else {
            resetWheel();
        }
    }

    // --- Auto-login from session storage ---
    const savedSessionPhone = sessionStorage.getItem('logged_member_phone');
    if (savedSessionPhone) {
        const preMatched = users.find(u => u.phone === savedSessionPhone);
        if (preMatched) {
            showApp(preMatched);
        }
    }

    // --- Login ---
    const loginAction = () => {
        const fname = loginFname.value.trim().toLowerCase();
        const inputPassword = loginPhone.value.trim();

        const matchedMember = users.find(u => {
            const uFirstName = u.fullName.split(' ')[0].toLowerCase();
            const effectivePassword = getEffectivePassword(u);
            return uFirstName === fname && effectivePassword === inputPassword;
        });

        if (matchedMember) {
            sessionStorage.setItem('logged_member_phone', matchedMember.phone);
            showToast('Login successful! Welcome ' + matchedMember.fullName);
            loginError.classList.add('hidden');
            showApp(matchedMember);
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
    const toggleMemberPass = document.getElementById('toggle-member-pass');
    toggleMemberPass.addEventListener('click', () => {
        const type = loginPhone.getAttribute('type') === 'password' ? 'text' : 'password';
        loginPhone.setAttribute('type', type);

        toggleMemberPass.querySelector('.eye-open').classList.toggle('hidden', type !== 'password');
        toggleMemberPass.querySelector('.eye-closed').classList.toggle('hidden', type === 'password');
    });

    // --- Logout ---
    document.getElementById('logout-btn').addEventListener('click', () => {
        sessionStorage.removeItem('logged_member_phone');
        state.currentMember = null;
        loginFname.value = '';
        loginPhone.value = '';
        loginError.classList.add('hidden');
        appContainer.classList.add('hidden');
        loginContainer.classList.remove('hidden');
    });

    // --- Member self-service Change Password ---
    document.getElementById('change-password-btn').addEventListener('click', () => {
        if (!state.currentMember) return;
        const currentPass = getEffectivePassword(state.currentMember);
        openChangePasswordModal(
            state.currentMember.phone,
            'Change your password',
            currentPass,
            async (newPassword) => {
                showToast('Syncing to sheet...');

                const success = await saveMemberPassword(state.currentUser.phone, newPassword);
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
    if (testToggle) {
        testToggle.addEventListener('change', (e) => {
            state.testMode = e.target.checked;
            if (state.testMode) {
                showToast('Test mode on: Wheel unlocked.');
                resetWheel();
            } else {
                showToast('Syncing your real state...');
                // Smoothly re-sync without a reload
                if (state.currentMember) {
                    // Check if they are already paired in the real data
                    if (state.currentMember.pairedWith) {
                        const pairedPerson = users.find(u => u.cleanPhone === state.currentMember.pairedWith);
                        if (pairedPerson) {
                            showPairedResult(pairedPerson);
                        } else {
                            resetWheel();
                        }
                    } else {
                        resetWheel();
                    }
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
export function openChangePasswordModal(memberPhone, title, currentPassword, onSave) {
    const overlay = document.getElementById('change-phone-overlay');
    const input = document.getElementById('new-phone-input');
    const errEl = document.getElementById('change-phone-error');
    const toggle = document.getElementById('toggle-modal-pass');

    document.getElementById('change-phone-title').innerText = title;
    input.value = '';

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
