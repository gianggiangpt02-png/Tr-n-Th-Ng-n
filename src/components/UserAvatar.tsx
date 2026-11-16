import React, { useState } from 'react';
import { Coffee } from 'lucide-react';

interface UserAvatarProps {
  avatar?: string;
  fullName: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<UserAvatarProps['size']>, string> = {
  xs: 'w-7 h-7 text-xs',
  sm: 'w-9 h-9 text-sm',
  md: 'w-12 h-12 text-base',
  lg: 'w-20 h-20 text-2xl',
};

const PRESET_MAP: Record<string, { bg: string; fg: string }> = {
  'preset:rose': { bg: '#F9D5D3', fg: '#B8434A' },
  'preset:peach': { bg: '#FCE8D5', fg: '#914F1E' },
  'preset:butter': { bg: '#FBDB93', fg: '#6F3F2A' },
  'preset:matcha': { bg: '#DCE9C9', fg: '#5F8A56' },
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'J';
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].slice(0, 1)}${parts[parts.length - 1].slice(0, 1)}`.toUpperCase();
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  avatar = '',
  fullName,
  size = 'sm',
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);
  const sizeCls = SIZE_CLASSES[size];
  const initials = getInitials(fullName);

  const isImage =
    !imgError &&
    avatar &&
    (avatar.startsWith('data:image/') ||
      avatar.startsWith('http://') ||
      avatar.startsWith('https://') ||
      avatar.startsWith('/'));

  if (isImage) {
    return (
      <img
        src={avatar}
        alt={`Ảnh đại diện của ${fullName}`}
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
        className={`${sizeCls} rounded-full object-cover border border-[#8A5036]/20 shrink-0 ${className}`}
      />
    );
  }

  if (avatar && PRESET_MAP[avatar]) {
    const preset = PRESET_MAP[avatar];
    return (
      <div
        aria-label={`Ảnh đại diện của ${fullName}`}
        style={{ backgroundColor: preset.bg, color: preset.fg }}
        className={`${sizeCls} rounded-full flex items-center justify-center font-bold border border-[#8A5036]/20 shrink-0 select-none ${className}`}
      >
        <Coffee className={size === 'lg' ? 'w-8 h-8' : size === 'md' ? 'w-5 h-5' : 'w-4 h-4'} />
      </div>
    );
  }

  const bgHex =
    avatar && avatar.startsWith('initials:') ? avatar.replace('initials:', '') : '#D4606A';

  return (
    <div
      aria-label={`Ảnh đại diện của ${fullName}`}
      style={{ backgroundColor: bgHex, color: '#FFF4EA' }}
      className={`${sizeCls} rounded-full flex items-center justify-center font-bold border border-white/30 shrink-0 select-none ${className}`}
    >
      {initials}
    </div>
  );
};
