import { Avatar, Box, SxProps, Theme } from '@mui/material';

export type CuteAvatarVariant = 'tangerine' | 'blueberry' | 'matcha' | 'lavender' | 'lemon';

export const CUTE_AVATARS: Array<{ id: CuteAvatarVariant; name: string; color: string }> = [
  { id: 'tangerine', name: '橘子貓', color: '#E97842' },
  { id: 'blueberry', name: '藍莓熊', color: '#527EA6' },
  { id: 'matcha', name: '抹茶兔', color: '#739B76' },
  { id: 'lavender', name: '薰衣狐', color: '#9477B8' },
  { id: 'lemon', name: '檸檬雞', color: '#D19E2C' },
];

const palette: Record<CuteAvatarVariant, { bg: string; face: string; accent: string; cheek: string }> = {
  tangerine: { bg: '#F5B994', face: '#FFF4E6', accent: '#C85E39', cheek: '#F09C91' },
  blueberry: { bg: '#B8D2E5', face: '#F6FBFC', accent: '#416A96', cheek: '#A9C9E0' },
  matcha: { bg: '#C9DFC5', face: '#FAFFF3', accent: '#527A5B', cheek: '#E9AFA1' },
  lavender: { bg: '#D8C7E8', face: '#FFF8FF', accent: '#76558E', cheek: '#E6B2CA' },
  lemon: { bg: '#F4D985', face: '#FFFDF1', accent: '#9F7619', cheek: '#F1B38A' },
};

function avatarSvg(variant: CuteAvatarVariant): string {
  const p = palette[variant];
  const details = {
    tangerine: `<path d="M24 38 29 13l19 14M72 38 67 13 48 27" fill="${p.bg}" stroke="${p.accent}" stroke-width="3" stroke-linejoin="round"/><path d="M22 55h-9M21 61h-8M74 55h9M75 61h8" stroke="${p.accent}" stroke-width="2.5" stroke-linecap="round"/>`,
    blueberry: `<circle cx="24" cy="29" r="13" fill="${p.bg}" stroke="${p.accent}" stroke-width="3"/><circle cx="72" cy="29" r="13" fill="${p.bg}" stroke="${p.accent}" stroke-width="3"/><path d="M28 68c8 7 32 7 40 0l5 12H23z" fill="#7698B5" stroke="${p.accent}" stroke-width="2"/>`,
    matcha: `<path d="M31 40c-7-17-4-29 4-28 8 1 7 15 7 26M65 40c7-17 4-29-4-28-8 1-7 15-7 26" fill="${p.bg}" stroke="${p.accent}" stroke-width="3" stroke-linecap="round"/><path d="M76 18c7-5 11 2 5 7-5 4-9 1-5-7z" fill="#89AD79" stroke="${p.accent}" stroke-width="2"/>`,
    lavender: `<path d="M16 47 23 14l25 15 25-15 7 33" fill="${p.bg}" stroke="${p.accent}" stroke-width="3" stroke-linejoin="round"/><path d="m73 14 3-7 3 7 7 3-7 3-3 7-3-7-7-3z" fill="#F2C86B" stroke="${p.accent}" stroke-width="1.5"/>`,
    lemon: `<path d="M24 42c-3-19 7-30 24-30s27 11 24 30" fill="${p.bg}" stroke="${p.accent}" stroke-width="3"/><path d="m43 16 5-8 5 8" fill="${p.bg}" stroke="${p.accent}" stroke-width="3" stroke-linejoin="round"/><path d="m43 57 5 3 5-3" fill="none" stroke="${p.accent}" stroke-width="3" stroke-linecap="round"/>`,
  }[variant];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><defs><linearGradient id="g" x1="10" y1="8" x2="86" y2="88" gradientUnits="userSpaceOnUse"><stop stop-color="#fff" stop-opacity=".5"/><stop offset="1" stop-color="${p.bg}" stop-opacity=".15"/></linearGradient></defs><circle cx="48" cy="48" r="46" fill="${p.bg}"/><circle cx="48" cy="48" r="46" fill="url(#g)"/>${details}<ellipse cx="48" cy="53" rx="31" ry="28" fill="${p.face}" stroke="${p.accent}" stroke-width="3"/><ellipse cx="37" cy="49" rx="3.2" ry="4" fill="#19314F"/><ellipse cx="59" cy="49" rx="3.2" ry="4" fill="#19314F"/><circle cx="36" cy="48" r="1" fill="#fff"/><circle cx="58" cy="48" r="1" fill="#fff"/><path d="M44 61c2.5 3 5.5 3 8 0" fill="none" stroke="${p.accent}" stroke-width="2.5" stroke-linecap="round"/><ellipse cx="28" cy="61" rx="6" ry="3.5" fill="${p.cheek}" opacity=".65"/><ellipse cx="68" cy="61" rx="6" ry="3.5" fill="${p.cheek}" opacity=".65"/></svg>`;
}

export function isCuteAvatar(value?: string | null): boolean {
  return !!value?.startsWith('data:image/svg+xml');
}

export function getCuteAvatarDataUrl(variant: CuteAvatarVariant): string {
  return `data:image/svg+xml,${encodeURIComponent(avatarSvg(variant))}`;
}

interface CuteAvatarProps {
  size?: number;
  variant?: CuteAvatarVariant;
  sx?: SxProps<Theme>;
}

export default function CuteAvatar({ size = 40, variant = 'tangerine', sx }: CuteAvatarProps) {
  return (
    <Avatar sx={{ width: size, height: size, bgcolor: palette[variant].bg, border: '2px solid #fff', boxShadow: '0 4px 12px rgba(20,43,82,.14)', ...sx }}>
      <Box component="img" src={getCuteAvatarDataUrl(variant)} alt="" sx={{ width: '100%', height: '100%', display: 'block' }} />
    </Avatar>
  );
}
