export function asset(path: string): string {
  if (/^(https?:|data:)/.test(path)) return path;
  return `${import.meta.env.BASE_URL.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}
export function media(path: string): string {
  const origin = import.meta.env.PUBLIC_MEDIA_BASE;
  if (origin && path.startsWith('media/')) return `${origin.replace(/\/$/, '')}/${path.slice(6)}`;
  return asset(path);
}
