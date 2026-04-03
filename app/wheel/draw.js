import { state } from './state.js';

export const canvas = document.getElementById('wheel');
export const ctx = canvas.getContext('2d');

/**
 * Redraws the entire wheel to the canvas based on current state.
 */
export function drawWheel() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY);

    for (let i = 0; i < state.numSlices; i++) {
        const startAngle = state.currentAngle + i * state.sliceAngle;
        const endAngle = startAngle + state.sliceAngle;

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.closePath();

        ctx.fillStyle = state.colors[i % state.colors.length];
        ctx.fill();

        ctx.lineWidth = 2;
        ctx.strokeStyle = '#050505';
        ctx.stroke();

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(startAngle + state.sliceAngle / 2);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        ctx.font = 'bold 32px Outfit';
        ctx.fillText('?', radius - 40, 10);
        ctx.restore();
    }
}
