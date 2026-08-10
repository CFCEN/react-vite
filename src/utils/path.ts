/**
 * macOS firmlinks: the kernel reports /private/tmp and /private/var, but users
 * think in terms of /tmp and /var.
 */
const FIRMLINKS: Array<[string, string]> = [
  ['/private/tmp/', '/tmp/'],
  ['/private/var/', '/var/'],
];

const HOME_PREFIX = '/Users/';

/**
 * Normalize an absolute path for display: collapse macOS firmlinks and replace
 * the user's home directory with `~`. Returns the input unchanged when no rule
 * applies, so it is safe to call on relative paths or already-shortened values.
 */
export const shortenPath = (absolutePath: string): string => {
  if (!absolutePath) return absolutePath;

  let path = absolutePath;
  for (const [from, to] of FIRMLINKS) {
    if (path.startsWith(from)) {
      path = to + path.slice(from.length);
      break;
    }
  }

  if (path.startsWith(HOME_PREFIX)) {
    const [user, ...rest] = path.slice(HOME_PREFIX.length).split('/');
    // Only collapse when there is an actual user segment, so `/Users/` itself
    // and `/Users` are left alone.
    if (user) return rest.length ? `~/${rest.join('/')}` : '~';
  }

  return path;
};

/**
 * Expand a `~`-prefixed display path back to an absolute path.
 * `home` must be supplied by the caller since the browser cannot know it.
 */
export const expandPath = (displayPath: string, home: string): string => {
  if (!displayPath.startsWith('~')) return displayPath;
  const rest = displayPath.slice(1).replace(/^\//, '');
  return rest ? `${home.replace(/\/$/, '')}/${rest}` : home;
};

/**
 * 取文件路径的目录部分
 */
export const dirname = (filePath: string): string => {
  const idx = filePath.lastIndexOf('/');
  return idx >= 0 ? filePath.slice(0, idx) : filePath;
};

/**
 * 取文件路径的文件名部分
 */
export const basename = (filePath: string): string => {
  const idx = filePath.lastIndexOf('/');
  return idx >= 0 ? filePath.slice(idx + 1) : filePath;
};

/**
 * File extension without the leading dot, lowercased. Empty when absent.
 */
export const extname = (filePath: string): string => {
  const name = basename(filePath);
  const idx = name.lastIndexOf('.');
  return idx > 0 ? name.slice(idx + 1).toLowerCase() : '';
};
