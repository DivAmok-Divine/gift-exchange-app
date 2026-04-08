import { state } from './state.js';
import { drawWheel } from './draw.js';
import { saveMemberPairing } from '../../db/data.js';

// Callback registered by auth/login.js to show result after spin
let _onWinner = null;
export function setOnWinnerCallback(fn) { _onWinner = fn; }

/**
 * Starts a fresh spin with random velocity.
 */
export function spin() {
    if (state.isSpinning) return;

    // Guard: already paired in production mode
    const isAlreadyPaired = !!state.currentMember?.pairedWith;
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
    state.currentWinner = state.activeMembers[winningIndex];

    // Prevent self-pairing
    if (state.currentMember && state.currentWinner.phone === state.currentMember.phone) {
        state.currentWinner = state.activeMembers[(winningIndex + 1) % state.activeMembers.length];
        if (state.currentWinner.phone === state.currentMember.phone) {
            state.currentWinner = state.activeMembers[(winningIndex + 2) % state.activeMembers.length];
        }
    }

    if (state.currentMember && !state.testMode) {
        saveMemberPairing(state.currentMember.phone, state.currentWinner.phone);
    }

    if (_onWinner) _onWinner(state.currentWinner);
}
