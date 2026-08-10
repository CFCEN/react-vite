/**
 * 将绝对路径转换为 ~ 开头的简短形式（仅用于前端展示）
 */
export const shortenPath = (absolutePath: string): string => {
  if (!absolutePath) return absolutePath;
  const home = '/Users/';
  if (absolutePath.startsWith(home)) {
    const parts = absolutePath.slice(home.length).split('/');
    const username = parts[0];
    const rest = parts.slice(1).join('/');
    return `~/${rest}`;
  }
  return absolutePath;
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
