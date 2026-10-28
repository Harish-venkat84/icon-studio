import { connection } from 'next/server'
import { ImageEditor } from '@/components/image_editor'
import { PageHeader } from '@/components/page_header'
import { listTags } from '@/lib/icons'

export default async function NewImagePage() {
  await connection()
  const tags = await listTags().catch(() => [])

  return (
    <>
      <PageHeader
        eyebrow="New image"
        title="Add a PNG"
        description="Upload a PNG up to 1 MB and give it a name and a unique slug. Its size is read from the file."
      />
      <ImageEditor knownTags={tags} />
    </>
  )
}
