/**
 * Show a toast notification that appears briefly and fades out
 * @param {string} message - The message to display
 * @param {number} duration - Duration in ms before fading (default 3000)
 */
export function showToast(message, duration = 3000) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, duration + 300); // Add extra time for fade animation
}
