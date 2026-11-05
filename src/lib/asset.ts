/** URL for a file in public/, relative to wherever the game is hosted (root, /melongeddon/, an itch.io CDN folder...). */
export function asset(path: string) {
  return `${import.meta.env.BASE_URL}${path}`;
}
