/** STUDIO_READ_ONLY=true turns the studio into a public demo: browsing works, writes are refused. */
export function isReadOnly(): boolean {
  return process.env.STUDIO_READ_ONLY === 'true'
}

export const READ_ONLY_MESSAGE = 'This is a read-only demo. Saving, deleting and releasing are off.'
