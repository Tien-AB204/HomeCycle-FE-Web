export const isPathMatch = (pathname, path, exact = false) =>
  pathname === path || (!exact && pathname.startsWith(`${path}/`));

export const isNavItemActive = (pathname, item, exactPath) =>
  isPathMatch(pathname, item.path, item.path === exactPath) ||
  (Array.isArray(item.matchPaths)
    ? item.matchPaths.some((path) => isPathMatch(pathname, path))
    : false);
