import { state } from '../wheel/state.js';
import { drawWheel } from '../wheel/draw.js';
import { showToast } from './toast.js';
import { saveMemberPairing } from '../../db/data.js';
import { showAppAlert } from '../auth/login.js';

/**
 * Greys out the wheel, shows the "already spun" message,
 * and renders the paired user result card.
 */
export function showPairedResult(winner) {
    const wheelMain = document.getElementById('wheel-main');
    wheelMain.classList.remove('hidden');
    drawWheel();

    const wheelContainer = document.querySelector('.wheel-container');
    wheelContainer.style.filter = 'grayscale(100%) opacity(0.4)';
    wheelContainer.style.pointerEvents = 'none';

    const instructionsEl = document.getElementById('first-timer-instructions');
    if (instructionsEl) instructionsEl.classList.add('hidden');

    let msgEl = document.getElementById('already-spun-msg');
    if (!msgEl) {
        msgEl = document.createElement('p');
        msgEl.id = 'already-spun-msg';
        msgEl.innerText = 'You have already spun the wheel. You cannot spin again for this event.';
        msgEl.style.color = '#ff7675';
        msgEl.style.marginTop = '25px';
        msgEl.style.fontSize = '1.05rem';
        msgEl.style.fontWeight = '600';
        msgEl.style.textAlign = 'center';
        wheelMain.appendChild(msgEl);
    }

    const resultContainer = document.getElementById('pair-result-container');
    const isTest = state.testMode;

    // Always grey out the wheel to focus on the result
    wheelContainer.style.filter = 'grayscale(100%) opacity(0.4)';
    wheelContainer.style.pointerEvents = 'none';

    if (isTest && msgEl) {
        msgEl.remove(); // No need for the "already spun" warning in test mode
    }

    const savedType = state.currentUser?.giftType;
    const giftLabel = savedType || '[Select one below]';
    const giftStyle = savedType ? '' : 'border-bottom:1px solid rgba(212,175,55,0.3); padding-bottom:2px;';

    resultContainer.innerHTML = `
        <div id="capture-card" class="paired-card" style="position:relative; margin-top:20px; margin-bottom:20px; text-align:left; background:rgba(0,0,0,0.2); padding:18px; border-radius:12px; border:1px solid rgba(255,255,255,0.1);">
            <!-- Branded header — hidden in app, shown only when sharing as image -->
            <div id="capture-logo" style="display:none; flex-direction:row; align-items:center; width:100%; margin-bottom:20px; padding-bottom:14px; border-bottom:1px solid rgba(255,255,255,0.08);">
                <!-- Left: logo + ministry name + event name stacked -->
                <div style="display:flex; align-items:center; gap:12px; flex:1;">
                    <img src="media/ABMinistry.jpeg" style="width:36px; height:36px; border-radius:50%; border:1.5px solid var(--secondary-color);" />
                    <div style="display:flex; flex-direction:column; line-height:1.3;">
                        <span style="font-size:1rem; font-weight:800; color:var(--secondary-color);">Akosua Betty Ministries</span>
                        <span style="font-size:0.78rem; color:#a4b0be; font-weight:400;">${state.activeEvent?.name || 'Gift exchange'}</span>
                    </div>
                </div>
            </div>

            <!-- Share button + heading row -->
            <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:10px; margin-bottom:15px;">
                <h3 style="margin:0; color:var(--secondary-color); font-size:1.05rem; font-weight:800; line-height:1.4; flex:1;">${isTest ? 'Test spin result:' : (state.currentUser?.fullName || 'Winner') + ' is paired with:'}</h3>
                ${!isTest ? `
                <button onclick="window.__sharePairing('${winner.fullName}', '${winner.phone}')" 
                    style="flex-shrink:0; background:rgba(255,255,255,0.1); border:none; padding:7px 10px; border-radius:8px; color:var(--secondary-color); cursor:pointer; display:flex; align-items:center; gap:5px; font-size:0.75rem; font-weight:700; white-space:nowrap;" title="Share this pairing">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                    Share
                </button>` : ''}
            </div>

            <p style="margin-bottom:10px; font-size:1.05rem;"><strong>Name:</strong> <span class="result-value" style="font-weight:800; margin-left:5px;">${winner.fullName}</span></p>
            <p style="margin-bottom:10px; font-size:1.05rem;"><strong>Phone:</strong> <span class="result-value" style="font-weight:800; margin-left:5px;">${winner.phone}</span></p>
            
            <p style="margin-bottom:20px; font-size:1.05rem;"><strong>Gift type:</strong> <span id="capture-gift-value" class="result-value" style="color:var(--secondary-color); font-weight:800; margin-left:5px; ${giftStyle}">${giftLabel}</span></p>
            
            <div class="no-capture">
                <div style="height:1px; background:rgba(255,255,255,0.05); margin:20px 0;"></div>
                <h4 style="margin-bottom:12px; color:#dcdde1; font-weight:600; font-size:0.95rem;">Choose a gift type to send:</h4>
                <div style="display:flex; flex-direction:column; gap:10px;">
                    <button class="btn momo-btn" onclick="window.__confirmMoMo('${winner.fullName}', '${winner.phone}')">Send MoMo</button>
                    <button class="btn gift-btn" onclick="window.__selectGiftType('Physical gift'); window.showToast('Proceeding to physical gift...')">Send physical gift</button>
                    ${isTest ? '<button class="btn" style="padding:12px; margin-top:10px; background:#444; border:none; color:inherit; border-radius:8px; font-weight:700; cursor:pointer;" onclick="window.resetWheel()">Clear test result</button>' : ''}
                </div>
            </div>
        </div>
    `;

    // Confirmation for MoMo
    window.__confirmMoMo = (name, phone) => {
        showAppAlert(
            "Send MoMo",
            `Would you like to call ${name} at ${phone} to arrange the MoMo transfer?`,
            () => {
                window.__selectGiftType('MoMo');
                window.showToast('Opening dialer...');
                setTimeout(() => window.location.href = `tel:${phone}`, 800);
            },
            () => { /* Member said No, do nothing */ }
        );
    };

    // Global helper to show the selected gift type in the card (and image)
    window.__selectGiftType = (type) => {
        const val = document.getElementById('capture-gift-value');
        if (val) {
            val.innerText = type;
            val.style.borderBottom = 'none'; // Clear the [Select one] underline

            // Sync to global state so it's live everywhere
            if (state.currentUser) {
                state.currentUser.giftType = type;
            }

            // Sync to Google Sheet
            if (state.currentUser && !state.testMode) {
                saveMemberPairing(state.currentUser.phone, winner.phone, type);
            }
        }
    };
    resultContainer.classList.remove('hidden');
}

// Expose resetWheel to window for the "Clear Result" button
window.resetWheel = resetWheel;

/**
 * Restores the wheel to its active, spinnable state.
 */
export function resetWheel() {
    document.getElementById('wheel-main').classList.remove('hidden');
    document.getElementById('pair-result-container').classList.add('hidden');

    const wheelContainer = document.querySelector('.wheel-container');
    wheelContainer.style.filter = 'none';
    wheelContainer.style.pointerEvents = 'auto';

    const instructionsEl = document.getElementById('first-timer-instructions');
    if (instructionsEl) instructionsEl.classList.remove('hidden');

    const msgEl = document.getElementById('already-spun-msg');
    if (msgEl) msgEl.remove();

    drawWheel();
}
