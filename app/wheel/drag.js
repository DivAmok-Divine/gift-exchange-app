import { state } from './state.js';
import { drawWheel, canvas } from './draw.js';
import { animate } from './spin.js';

function getAngleFromEvent(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches && e.touches.length > 0 ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches && e.touches.length > 0 ? e.touches[0].clientY : e.clientY;
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    return Math.atan2(clientY - centerY, clientX - centerX);
}

function handleDragStart(e) {
    if (state.isSpinning) return;
    if (e.cancelable) e.preventDefault();
    state.isDragging = true;
    state.previousDragAngle = getAngleFromEvent(e);
    state.dragSpeeds = [];
}

function handleDragMove(e) {
    if (!state.isDragging || state.isSpinning) return;
    if (e.cancelable) e.preventDefault();

    const currentEventAngle = getAngleFromEvent(e);
    let delta = currentEventAngle - state.previousDragAngle;

    if (delta > Math.PI) delta -= 2 * Math.PI;
    if (delta < -Math.PI) delta += 2 * Math.PI;

    state.currentAngle += delta;
    state.dragSpeeds.push({ delta, time: Date.now() });
    if (state.dragSpeeds.length > 5) state.dragSpeeds.shift();

    state.previousDragAngle = currentEventAngle;
    drawWheel();
}

function handleDragEnd(e) {
    if (!state.isDragging || state.isSpinning) return;
    state.isDragging = false;

    if (state.dragSpeeds.length > 1) {
        const first = state.dragSpeeds[0];
        const last = state.dragSpeeds[state.dragSpeeds.length - 1];
        const timeDiff = last.time - first.time;

        if (timeDiff > 0 && timeDiff < 300) {
            let totalDelta = 0;
            for (let i = 1; i < state.dragSpeeds.length; i++) {
                totalDelta += state.dragSpeeds[i].delta;
            }
            const avgVelocityPerFrame = (totalDelta / timeDiff) * 16;

            if (Math.abs(avgVelocityPerFrame) > 0.05) {
                state.isSpinning = true;
                state.spinVelocity = avgVelocityPerFrame * 1.5;
                if (state.spinVelocity > 0) state.spinVelocity = Math.max(0.15, Math.min(state.spinVelocity, 0.5));
                if (state.spinVelocity < 0) state.spinVelocity = Math.min(-0.15, Math.max(state.spinVelocity, -0.5));
                animate();
            }
        }
    }
}

/**
 * Attaches all mouse and touch event listeners to the canvas.
 */
export function initDrag() {
    canvas.addEventListener('mousedown', handleDragStart);
    canvas.addEventListener('mousemove', handleDragMove);
    canvas.addEventListener('mouseup', handleDragEnd);
    canvas.addEventListener('mouseleave', handleDragEnd);
    canvas.addEventListener('touchstart', handleDragStart, { passive: false });
    canvas.addEventListener('touchmove', handleDragMove, { passive: false });
    canvas.addEventListener('touchend', handleDragEnd);
}
