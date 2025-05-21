export const ensureTrailingSlash = (path: string) => {
  return path.endsWith('/') ? path : path + '/'
}
