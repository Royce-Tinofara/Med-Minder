/**
 * Notification utilities for playing sounds and displaying alerts
 */

/**
 * Check if notifications are enabled in user preferences
 */
const areNotificationsEnabled = (): boolean => {
  if (typeof window === "undefined") return false;
  const saved = localStorage.getItem("notificationsEnabled");
  return saved ? JSON.parse(saved) : false;
};

/**
 * Play a notification sound using Web Audio API
 */
export const playNotificationSound = () => {
  if (!areNotificationsEnabled()) return;

  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    // Create a pleasant notification tone (ascending notes)
    oscillator.frequency.setValueAtTime(523.251, audioContext.currentTime); // C5
    oscillator.frequency.setValueAtTime(659.255, audioContext.currentTime + 0.1); // E5
    oscillator.frequency.setValueAtTime(783.991, audioContext.currentTime + 0.2); // G5

    gain.gain.setValueAtTime(0.3, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (err) {
    console.error("Failed to play notification sound:", err);
    // Fallback: try to play system sound if available
    try {
      const audio = new Audio("data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==");
      audio.play().catch(() => {
        // Silent fail if audio can't play
      });
    } catch {
      // If all else fails, just continue without sound
    }
  }
};

/**
 * Request notification permission from browser
 */
export const requestNotificationPermission = async () => {
  if (!("Notification" in window)) {
    console.log("This browser does not support notifications");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission !== "denied") {
    try {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    } catch (err) {
      console.error("Error requesting notification permission:", err);
      return false;
    }
  }

  return false;
};

/**
 * Show a browser notification
 */
export const showBrowserNotification = (
  title: string,
  options?: NotificationOptions
) => {
  if (!areNotificationsEnabled()) return;

  try {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, {
        icon: "/masked-icon.svg",
        badge: "/masked-icon.svg",
        ...options,
      });
    }
  } catch (err) {
    console.error("Failed to show notification:", err);
  }
};
