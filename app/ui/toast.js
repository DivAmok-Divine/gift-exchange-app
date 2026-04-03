/**
 * Shows a sliding toast notification at the top of the screen.
 * Also exported to window so inline HTML onclick handlers can call it.
 */
export function showToast(message) {
    const toast = document.getElementById('toast-notification');
    document.getElementById('toast-message').innerText = message;
    toast.classList.remove('toast-hidden');
    setTimeout(() => {
        toast.classList.add('toast-hidden');
    }, 3000);
}

window.showToast = showToast;
