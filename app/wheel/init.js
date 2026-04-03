import { state } from './state.js';

/**
 * Shuffles users array and picks 6 active participants.
 * Also computes numSlices and sliceAngle into state.
 */
export function initActiveUsers(users) {
    let temp = [...users];
    for (let i = temp.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [temp[i], temp[j]] = [temp[j], temp[i]];
    }
    state.activeUsers = temp.slice(0, 6);
    state.numSlices = state.activeUsers.length;
    state.sliceAngle = (2 * Math.PI) / state.numSlices;
}
