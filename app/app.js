import { fetchUsers, fetchAdmins, fetchEvents } from '../db/data.js';
import { state } from './wheel/state.js';

import { initActiveUsers } from './wheel/init.js';
import { drawWheel } from './wheel/draw.js';
import { spin } from './wheel/spin.js';
import { initDrag } from './wheel/drag.js';

import { initLogin } from './auth/login.js';
import { initAdmin } from './auth/admin.js';

async function boot() {
    try {
        // Fetch users, admins, and events from Google data in parallel
        const [users, admins, events] = await Promise.all([
            fetchUsers(),
            fetchAdmins(),
            fetchEvents()
        ]);

        // Sync events into global state
        state.allEvents = events;
        const active = events.find(e => e.isActive);
        if (active) state.activeEvent = active;
        else if (events.length > 0) state.activeEvent = events[0]; // Fallback to first if none active

        // Apply dynamic titles before rendering
        if (state.activeEvent && state.activeEvent.name) {
            const newName = state.activeEvent.name;
            const brandSpan = document.querySelector('.nav-brand span');
            if (brandSpan) brandSpan.innerText = newName;

            const headerH1 = document.querySelector('#app-container header h1');
            if (headerH1) headerH1.innerText = newName;

            const welcomeH3 = document.getElementById('welcome-instruction-title');
            if (welcomeH3) {
                 const svg = welcomeH3.querySelector('svg')?.outerHTML || '';
                 welcomeH3.innerHTML = `${svg} Welcome to the ${newName}!`;
            }
            document.title = newName + ' | Akosua Betty Ministries';
        }

        // Hide loading screen, reveal app
        document.getElementById('loading-screen').style.display = 'none';

        // --- Boot sequence ---
        initActiveUsers(users);
        drawWheel();
        document.getElementById('spin-btn').addEventListener('click', spin);
        initDrag();
        initLogin(users);
        initAdmin(users, admins);

    } catch (err) {
        const loading = document.getElementById('loading-screen');
        loading.innerHTML = `
            <p style="color:#ff7675; font-family:'Outfit',sans-serif; font-size:1.1rem; font-weight:700; text-align:center; padding:20px;">
                ⚠️ Could not load data.<br>
                <span style="font-size:0.9rem; font-weight:400; color:#a4b0be;">Check your internet connection and try refreshing.</span>
            </p>
        `;
        console.error('Boot error:', err);
    }
}

// --- Global Sharing Utility ---
window.__sharePairing = async (name, phone) => {
    const card = document.getElementById('capture-card');
    if (!card) return;

    // --- ENFORCE SELECTION ---
    const giftVal = document.getElementById('capture-gift-value');
    if (!giftVal || giftVal.innerText.includes('[Select')) {
        import('./ui/toast.js').then(m => m.showToast('Please choose a reward type (MoMo or Physical) before sharing! 🎁'));
        // Pulse the reward buttons to guide the user
        const rewardBtns = card.querySelectorAll('.no-capture button');
        rewardBtns.forEach(b => {
             b.style.animation = 'pulse-gold 0.5s ease-in-out 3';
        });
        return;
    }

    import('./ui/toast.js').then(m => m.showToast('Generating shareable image...'));

    try {
        // Temporarily prepare UI for capture
        const actions = card.querySelector('.no-capture');
        const shareBtn = card.querySelector('button');
        const captureLogo = document.getElementById('capture-logo');

        if (actions) actions.style.display = 'none';
        if (shareBtn) shareBtn.style.display = 'none';
        if (captureLogo) captureLogo.style.display = 'flex';
        
        const originalBg = card.style.background;
        card.style.background = '#1e1e2f'; // Solid bg for capture

        const canvas = await html2canvas(card, {
            backgroundColor: '#1e1e2f',
            scale: 2,
            logging: false,
            useCORS: true
        });

        // Restore UI
        if (actions) actions.style.display = 'block';
        if (shareBtn) shareBtn.style.display = 'flex';
        if (captureLogo) captureLogo.style.display = 'none';
        card.style.background = originalBg;

        const dataUrl = canvas.toDataURL('image/png');
        
        // Open the preview modal
        const previewOverlay = document.getElementById('image-preview-overlay');
        const previewImg = document.getElementById('preview-capture-img');
        const downloadBtn = document.getElementById('download-preview-btn');
        const shareActionBtn = document.getElementById('share-action-btn');

        previewImg.src = dataUrl;
        previewOverlay.classList.remove('hidden');

        // Handle Download
        downloadBtn.onclick = () => {
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `Greeting_${name.replace(/\s+/g, '_')}.png`;
            link.click();
        };

        // Handle Native Share
        shareActionBtn.onclick = async () => {
            canvas.toBlob(async (blob) => {
                if (!blob) {
                    import('./ui/toast.js').then(m => m.showToast('Could not create image file. ⚠️'));
                    return;
                }
                
                const fileName = `Greeting_${name.replace(/\s+/g, '_')}.png`;
                const file = new File([blob], fileName, { type: 'image/png' });
                
                // CRITICAL: Check if sharing this specific file is actually supported
                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    try {
                        await navigator.share({
                            files: [file],
                            title: 'My Gift Pairing',
                            text: `I've been paired with ${name}! 🎁`
                        });
                    } catch (err) { 
                        console.warn('Native share failed:', err);
                        // If it's a real failure (not user cancelling), show error
                        if (err.name !== 'AbortError') {
                            import('./ui/toast.js').then(m => m.showToast('Sharing failed. Please use Download ⬇️'));
                        }
                    }
                } else {
                    // Fallback to clipboard or download if sharing is blocked
                    import('./ui/toast.js').then(m => m.showToast('Sharing not supported on this browser. Use "Download" instead. ⬇️'));
                }
            }, 'image/png');
        };

        document.getElementById('close-preview-btn').onclick = () => {
            previewOverlay.classList.add('hidden');
        };

    } catch (err) {
        console.error('Capture failed:', err);
        import('./ui/toast.js').then(m => m.showToast('Failed to generate image.'));
    }
};

boot();

