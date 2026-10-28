import { headers } from 'next/headers'
import { USER_HEADER } from './constants'

export async function currentUser(): Promise<string> {
  return (await headers()).get(USER_HEADER) ?? 'unknown'
}
