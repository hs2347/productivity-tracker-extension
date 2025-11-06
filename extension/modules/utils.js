/**
 * Extracts the hostname from a URL.
 * @param {string} url - The full URL.
 * @returns {string | null} The hostname or null if invalid.
 */
export function getDomain(url) {
  try {
    // Handle special chrome:// URLs
    if (url.startsWith('chrome://')) {
      return new URL(url).hostname;
    }
    // Handle standard http/https URLs
    if (url.startsWith('http')) {
      return new URL(url).hostname;
    }
    return null; // Ignore other protocols
  } catch (e) {
    console.warn(`Could not parse URL: ${url}`, e);
    return null;
  }
}