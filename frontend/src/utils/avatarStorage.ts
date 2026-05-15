
export function getStoredAvatars(): Record<string, string> {
  const stored = localStorage.getItem('employee_avatars');
  return stored ? JSON.parse(stored) : {};
}

export function saveAvatar(employeeId: string, dataUrl: string) {
  const avatars = getStoredAvatars();
  avatars[employeeId] = dataUrl;
  localStorage.setItem('employee_avatars', JSON.stringify(avatars));
  
  // Dispatch a custom event so other components can refresh
  window.dispatchEvent(new CustomEvent('avatar_updated', { detail: { employeeId, dataUrl } }));
}
