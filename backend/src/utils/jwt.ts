import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '7d';
const GUEST_TOKEN_EXPIRES_IN = '24h'; // Guest tokens expire in 24 hours

export interface JWTPayload {
  userId: number;
}

export interface GuestTokenPayload {
  memberId: number;
  eventId: number;
}

export function signToken(userId: number): string {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }
  
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function generateGuestToken(memberId: number, eventId: number): string {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }
  
  return jwt.sign({ memberId, eventId }, JWT_SECRET, { expiresIn: GUEST_TOKEN_EXPIRES_IN });
}

export function verifyToken(token: string): JWTPayload {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

export function verifyGuestToken(token: string): GuestTokenPayload {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as GuestTokenPayload;
    if (!decoded.memberId || !decoded.eventId) {
      throw new Error('Invalid guest token format');
    }
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired guest token');
  }
}


