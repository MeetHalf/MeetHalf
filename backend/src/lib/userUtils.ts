import prisma from './prisma';

/**
 * Get user name from user ID
 * Returns user's name or email, or 'Unknown' if not found
 */
export async function getUserName(userId: number): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });
  return user?.name || user?.email || 'Unknown';
}

/**
 * Get or create anonymous user identifier from session
 * Returns a consistent identifier for anonymous users
 */
export function getAnonymousUserId(sessionId?: string): string {
  if (sessionId) {
    return `anonymous_${sessionId}`;
  }
  // Fallback: generate a simple ID (in production, use proper session ID)
  return `anonymous_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

