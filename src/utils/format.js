/**
 * FloodSense Helper Utilities & Formatting Functions
 */

/**
 * Format string dates to standardized Vietnamese readable datetime
 * @param {string|Date} dateString 
 * @returns {string}
 */
export function formatDate(dateString) {
  if (!dateString) return '---';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return String(dateString);
  
  return d.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Format decimal distance numbers into standard km units
 * @param {number} km 
 * @returns {string}
 */
export function formatDistance(km) {
  if (km === undefined || km === null) return '---';
  return `${Number(km).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} km`;
}

/**
 * Format decimal water level heights with m unit
 * @param {number} m 
 * @returns {string}
 */
export function formatWaterLevel(m) {
  if (m === undefined || m === null) return '---';
  return `${Number(m).toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m`;
}

/**
 * Get CSS colors according to severity levels
 * @param {'critical'|'high'|'warning'|'normal'} severity 
 * @returns {string} CSS variable representation
 */
export function getSeverityColor(severity) {
  switch (String(severity).toLowerCase()) {
    case 'critical':
    case 'danger':
      return 'var(--red-400)';
    case 'high':
    case 'warning':
      return 'var(--orange-400)';
    case 'medium':
    case 'info':
      return 'var(--cyan-400)';
    case 'low':
    case 'normal':
    default:
      return 'var(--green-400)';
  }
}
