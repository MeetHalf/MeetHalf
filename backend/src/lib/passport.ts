import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import prisma from './prisma';
import { signToken } from '../utils/jwt';

// Note: We don't use Passport sessions - we use JWT cookies instead
// serializeUser and deserializeUser are not needed

// Google OAuth Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: (() => {
          // Priority: BACKEND_URL > VERCEL_URL > localhost
          if (process.env.BACKEND_URL) {
            return `${process.env.BACKEND_URL}/auth/google/callback`;
          }
          if (process.env.VERCEL_URL) {
            return `https://${process.env.VERCEL_URL}/auth/google/callback`;
          }
          return 'http://localhost:3000/auth/google/callback';
        })(),
      },
      async (accessToken: any, refreshToken: any, profile: any, done: any) => {
        try {
          const email = profile.emails?.[0]?.value;
          const name = profile.displayName || profile.name?.givenName || email || 'User';
          const avatar = profile.photos?.[0]?.value;

          if (!email) {
            return done(new Error('No email found in Google profile'), undefined);
          }

          // Find existing user by googleId or email
          let user = await prisma.user.findFirst({
            where: {
              OR: [
                { googleId: profile.id },
                { email },
              ],
            },
          });

          if (user) {
            // Update existing user with Google info
            user = await prisma.user.update({
              where: { id: user.id },
              data: {
                googleId: profile.id,
                name: user.name || name,
                email,
                avatar: avatar || user.avatar,
                provider: 'GOOGLE',
                updatedAt: new Date(),
              },
            });
          } else {
            // Create new user
            user = await prisma.user.create({
              data: {
                googleId: profile.id,
                email,
                name,
                avatar,
                provider: 'GOOGLE',
              },
            });
          }

          return done(null, user);
        } catch (error) {
          return done(error, undefined);
        }
      }
    )
  );
}

// GitHub OAuth Strategy
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: (() => {
          // Priority: BACKEND_URL > VERCEL_URL > localhost
          if (process.env.BACKEND_URL) {
            return `${process.env.BACKEND_URL}/auth/github/callback`;
          }
          if (process.env.VERCEL_URL) {
            return `https://${process.env.VERCEL_URL}/auth/github/callback`;
          }
          return 'http://localhost:3000/auth/github/callback';
        })(),
      },
      async (accessToken: any, refreshToken: any, profile: any, done: any) => {
        try {
          const email = profile.emails?.[0]?.value || `${profile.username}@users.noreply.github.com`;
          const name = profile.displayName || profile.username || email || 'User';
          const avatar = profile.photos?.[0]?.value;

          // Find existing user by githubId or email
          let user = await prisma.user.findFirst({
            where: {
              OR: [
                { githubId: profile.id.toString() },
                { email },
              ],
            },
          });

          if (user) {
            // Update existing user with GitHub info
            user = await prisma.user.update({
              where: { id: user.id },
              data: {
                githubId: profile.id.toString(),
                name: user.name || name,
                email,
                avatar: avatar || user.avatar,
                provider: 'GITHUB',
                updatedAt: new Date(),
              },
            });
          } else {
            // Create new user
            user = await prisma.user.create({
              data: {
                githubId: profile.id.toString(),
                email,
                name,
                avatar,
                provider: 'GITHUB',
              },
            });
          }

          return done(null, user);
        } catch (error) {
          return done(error, undefined);
        }
      }
    )
  );
}

export default passport;

