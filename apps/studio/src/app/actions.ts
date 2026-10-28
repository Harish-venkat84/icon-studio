'use server'

import {
  MAX_PNG_BYTES,
  processSvg,
  SvgError,
  type IconMetaInput,
  type IconNode,
} from '@icon-studio/core'
import { revalidatePath } from 'next/cache'
import {
  deleteIcon,
  findDuplicateIcon,
  type DuplicateRef,
  releaseVersion,
  saveIcon,
  ValidationError,
  type SaveIconInput,
} from '@/lib/icons'
import { deleteImage, findDuplicateImage, saveImage } from '@/lib/images'
import { isReadOnly, READ_ONLY_MESSAGE } from '@/lib/read_only'
import { currentUser } from '@/lib/user'
import type { VersionBump } from '@/lib/version'

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string }

function failure(error: unknown): { ok: false; error: string } {
  if (error instanceof ValidationError || error instanceof SvgError) {
    return { ok: false, error: error.message }
  }
  console.error(error)
  return { ok: false, error: `Something went wrong: ${(error as Error).message}` }
}

const readOnlyFailure = { ok: false, error: READ_ONLY_MESSAGE } as const

export async function processSvgAction(
  raw: string,
  exceptSlug?: string
): Promise<
  ActionResult<{
    root: IconNode
    colors: string[]
    bytes: number
    duplicate: DuplicateRef | null
  }>
> {
  try {
    const processed = processSvg(raw, 'preview')
    const duplicate = await findDuplicateIcon(processed.fingerprint, exceptSlug).catch(() => null)
    return {
      ok: true,
      data: {
        root: processed.root,
        colors: processed.colors,
        bytes: Buffer.byteLength(processed.svg),
        duplicate,
      },
    }
  } catch (error) {
    return failure(error)
  }
}

export async function saveIconAction(
  input: SaveIconInput & { meta: IconMetaInput }
): Promise<ActionResult<{ slug: string }>> {
  if (isReadOnly()) return readOnlyFailure
  try {
    const meta = await saveIcon(input, await currentUser())
    revalidatePath('/', 'layout')
    return { ok: true, data: { slug: meta.slug } }
  } catch (error) {
    return failure(error)
  }
}

export async function deleteIconAction(slug: string): Promise<ActionResult<null>> {
  if (isReadOnly()) return readOnlyFailure
  try {
    await deleteIcon(slug, await currentUser())
    revalidatePath('/', 'layout')
    return { ok: true, data: null }
  } catch (error) {
    return failure(error)
  }
}

export async function releaseAction(bump: VersionBump): Promise<ActionResult<{ version: string }>> {
  if (isReadOnly()) return readOnlyFailure
  if (!['patch', 'minor', 'major'].includes(bump)) return { ok: false, error: 'Unknown bump' }
  try {
    const version = await releaseVersion(bump, await currentUser())
    revalidatePath('/', 'layout')
    return { ok: true, data: { version } }
  } catch (error) {
    return failure(error)
  }
}

export async function saveImageAction(formData: FormData): Promise<ActionResult<{ slug: string }>> {
  if (isReadOnly()) return readOnlyFailure
  try {
    const file = formData.get('file')
    let png: Uint8Array | undefined
    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_PNG_BYTES) {
        return { ok: false, error: `The PNG is larger than ${MAX_PNG_BYTES / 1024 / 1024} MB` }
      }
      png = new Uint8Array(await file.arrayBuffer())
    }
    const text = (key: string) => {
      const value = formData.get(key)
      return typeof value === 'string' ? value : ''
    }
    const previousSlug = text('previousSlug') || undefined
    const meta = await saveImage(
      {
        name: text('name').trim(),
        slug: text('slug'),
        alt: text('alt').trim(),
        tags: text('tags')
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        ...(previousSlug ? { previousSlug } : {}),
        ...(png ? { png } : {}),
      },
      await currentUser()
    )
    revalidatePath('/', 'layout')
    return { ok: true, data: { slug: meta.slug } }
  } catch (error) {
    return failure(error)
  }
}

export async function deleteImageAction(slug: string): Promise<ActionResult<null>> {
  if (isReadOnly()) return readOnlyFailure
  try {
    await deleteImage(slug, await currentUser())
    revalidatePath('/', 'layout')
    return { ok: true, data: null }
  } catch (error) {
    return failure(error)
  }
}

export async function checkImageAction(
  formData: FormData
): Promise<ActionResult<{ duplicate: DuplicateRef | null }>> {
  try {
    const file = formData.get('file')
    if (!(file instanceof File) || file.size > MAX_PNG_BYTES)
      return { ok: true, data: { duplicate: null } }
    const exceptSlug = formData.get('exceptSlug')
    const duplicate = await findDuplicateImage(
      new Uint8Array(await file.arrayBuffer()),
      typeof exceptSlug === 'string' && exceptSlug ? exceptSlug : undefined
    )
    return { ok: true, data: { duplicate } }
  } catch (error) {
    return failure(error)
  }
}
