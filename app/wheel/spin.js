import { state } from './state.js';
import { drawWheel } from './draw.js';
import { saveUserPairing } from '../../db/data.js';

// Callback registered by auth/login.js to show result after spin
let _onWinner = null;
export function setOnWinnerCallback(fn) { _onWinner = fn; }

/**
 * Starts a fresh spin with random velocity.
 */
export function spin() {
    if (state.isSpinning) return;

    // Guard: already paired in production mode
    const isAlreadyPaired = !!localStorage.getItem('pairedUser_' + state.currentUser?.phone) || !!state.currentUser?.pairedWith;
    if (isAlreadyPaired && !state.testMode) {
        return;
    }

    state.isSpinning = true;
    state.spinVelocity = Math.random() * 0.1 + 0.4;
    animate();
}

/**
 * Called by drag.js after a flick gesture to continue the spin.
 */
export function animate() {
    state.currentAngle += state.spinVelocity;
    state.spinVelocity *= 0.985;

    if (Math.abs(state.spinVelocity) < 0.002) {
        state.spinVelocity = 0;
        state.isSpinning = false;
        determineWinner();
        return;
    }

    drawWheel();
    state.animationId = requestAnimationFrame(animate);
}

function determineWinner() {
    let normalizedAngle = state.currentAngle % (2 * Math.PI);
    if (normalizedAngle < 0) normalizedAngle += 2 * Math.PI;
    const pointerAngle = 1.5 * Math.PI;
    let relativeAngle = (pointerAngle - normalizedAngle) % (2 * Math.PI);
    if (relativeAngle < 0) relativeAngle += 2 * Math.PI;

    const winningIndex = Math.floor(relativeAngle / state.sliceAngle);
    state.currentWinner = state.activeUsers[winningIndex];

    // Prevent self-pairing
    if (state.currentUser && state.currentWinner.phone === state.currentUser.phone) {
        state.currentWinner = state.activeUsers[(winningIndex + 1) % state.activeUsers.length];
        if (state.currentWinner.phone === state.currentUser.phone) {
            state.currentWinner = state.activeUsers[(winningIndex + 2) % state.activeUsers.length];
        }
    }

    if (state.currentUser && !state.testMode) {
        localStorage.setItem('pairedUser_' + state.currentUser.phone, JSON.stringify(state.currentWinner));
        saveUserPairing(state.currentUser.phone, state.currentWinner.phone);
    }

    if (_onWinner) _onWinner(state.currentWinner);
}
