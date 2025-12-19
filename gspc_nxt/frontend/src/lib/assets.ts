const normalizeBase = (base: string) => base.replace(/\/$/, '');

export const resolveAssetUrl = (path: string) => {
  if (!path) {
    return path;
  }

  if (/^(https?:)?\/\//i.test(path) || path.startsWith('data:')) {
    return path;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const base = import.meta.env.VITE_ASSET_URL
    ? normalizeBase(import.meta.env.VITE_ASSET_URL)
    : '';

  return base ? `${base}${normalizedPath}` : normalizedPath;
};
