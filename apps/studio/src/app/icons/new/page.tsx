import { connection } from 'next/server'
import { IconEditor } from '@/components/icon_editor'
import { PageHeader } from '@/components/page_header'
import { listTags } from '@/lib/icons'

export default async function NewIconPage() {
  await connection()
  const tags = await listTags().catch(() => [])

  return (
    <>
      <PageHeader
        eyebrow="New icon"
        title="Add an icon"
        description="Upload an SVG, give it a name and a unique slug, and choose how its colors behave."
      />
      <IconEditor knownTags={tags} />
    </>
  )
}
