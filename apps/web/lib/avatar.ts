export const AVATAR_PRESETS = [
  { id: 'purple', bg: 'bg-gradient-to-tr from-[#5c34ad] to-indigo-600', text: 'text-white' },
  { id: 'emerald', bg: 'bg-gradient-to-tr from-emerald-600 to-teal-500', text: 'text-white' },
  {
    id: 'sunset',
    bg: 'bg-gradient-to-tr from-rose-500 via-orange-500 to-amber-400',
    text: 'text-white',
  },
  { id: 'blue', bg: 'bg-gradient-to-tr from-blue-600 to-cyan-500', text: 'text-white' },
  { id: 'dark', bg: 'bg-gradient-to-tr from-slate-900 to-slate-700', text: 'text-white' },
];

export function getAvatarBgClass(avatarUrl?: string | null): string {
  if (avatarUrl?.startsWith('preset:')) {
    const id = avatarUrl.replace('preset:', '');
    const found = AVATAR_PRESETS.find((p) => p.id === id);
    if (found) return found.bg;
  }
  return 'bg-gradient-to-tr from-[#5c34ad] to-indigo-600';
}
