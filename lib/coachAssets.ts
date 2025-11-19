// Map coach avatar URLs to local assets
export const coachAvatarMap: Record<string, any> = {
  'assets/images/avatars/gockins.png': require('@/assets/images/avatars/gockins.png'),
  'assets/images/avatars/aurelius.png': require('@/assets/images/avatars/aurelius.png'),
  'assets/images/avatars/chase.png': require('@/assets/images/avatars/chase.png'),
  'assets/images/avatars/adrian.png': require('@/assets/images/avatars/Adrian.png'),
  // Backwards compatibility with older stored paths
  'assets/avatars/gockins.png': require('@/assets/images/avatars/gockins.png'),
  'assets/avatars/aurelius.png': require('@/assets/images/avatars/aurelius.png'),
  'assets/avatars/chase.png': require('@/assets/images/avatars/chase.png'),
  'assets/avatars/adrian.png': require('@/assets/images/avatars/Adrian.png'),
};

export function getCoachAvatar(avatarUrl: string | null | undefined): any {
  if (!avatarUrl) {
    return require('@/assets/images/avatars/Adrian.png'); // Default fallback
  }
  return coachAvatarMap[avatarUrl] || require('@/assets/images/avatars/Adrian.png');
}
