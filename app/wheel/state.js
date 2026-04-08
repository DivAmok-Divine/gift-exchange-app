/**
 * Shared mutable state store — imported by all wheel/ui/auth modules.
 * All modules mutate this object directly rather than using local vars.
 */
export const state = {
    // Wheel data
    activeMembers: [],
    numSlices: 0,
    sliceAngle: 0,
    colors: ['#D4AF37', '#1a1a1a', '#F8E08E', '#333333', '#C5A028'],

    // Spin physics
    currentAngle: 0,
    isSpinning: false,
    spinVelocity: 0,
    animationId: null,

    // Drag
    isDragging: false,
    previousDragAngle: 0,
    dragSpeeds: [],

    // Session
    currentWinner: null,
    currentMember: null,
    testMode: false,

    // Event Settings (Dynamic)
    activeEvent: {
        name: ' Exchange',
        startDate: '',
        endDate: '',
        isActive: true
    },
    allEvents: []
};
