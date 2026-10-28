import { toImageExportName, type ImageMeta } from './image.ts'
import { toComponentName, type IconMeta } from './meta.ts'

export type UsagePlatform = 'web' | 'native'

export interface UsageStep {
  title: string
  description: string
  language: 'bash' | 'tsx'
  code: string
}

export interface UsageRow {
  name: string
  type: string
  value: string
  description: string
}

export interface UsageGuide {
  intro: string
  steps: UsageStep[]
  table: { title: string; rows: UsageRow[] }
}

const PACKAGE = '@icon-studio/icons'

function label(name: string) {
  return name.trim() || 'Icon'
}

function colorPropsJsx(meta: IconMeta, indent = '') {
  return meta.colorProps.map((prop) => `${indent}${prop.name}="${prop.value}"`)
}

export function iconUsage(meta: IconMeta, platform: UsagePlatform): UsageGuide {
  const component = toComponentName(meta.slug)
  const size = meta.defaults.size
  const text = label(meta.name)
  const multi = meta.mode === 'multi'
  const extraProps = colorPropsJsx(meta)

  const colorAdvice = multi
    ? meta.colorProps.length
      ? `Multi-color icon: it keeps its artwork colors. Override ${meta.colorProps
          .map((prop) => prop.name)
          .join(' or ')} to recolor parts of it.`
      : 'Multi-color icon: it always keeps its artwork colors.'
    : platform === 'web'
      ? 'Single-color icon: it follows the text color, so any text-* class recolors it.'
      : 'Single-color icon: pass color to tint it.'

  const rows: UsageRow[] = [
    {
      name: 'size',
      type: 'number | string',
      value: String(size),
      description: 'Height in px. The width follows the artwork’s aspect ratio.',
    },
    {
      name: 'color',
      type: 'string',
      value: meta.defaults.color ?? 'currentColor',
      description: multi
        ? 'Colors the parts drawn with currentColor.'
        : platform === 'web'
          ? 'Icon color. Usually set with a text-* class instead.'
          : 'Icon color.',
    },
    {
      name: 'title',
      type: 'string',
      value: '—',
      description:
        platform === 'web'
          ? 'Accessible label. Without it the icon is aria-hidden.'
          : 'Becomes the accessibilityLabel. Without it screen readers skip the icon.',
    },
    ...meta.colorProps.map((prop) => ({
      name: prop.name,
      type: 'string',
      value: prop.value,
      description: `Replaces ${prop.value} in the artwork.`,
    })),
    platform === 'web'
      ? {
          name: '…svg props',
          type: 'SVGProps',
          value: '—',
          description: 'className, style, onClick, ref and any other <svg> attribute.',
        }
      : {
          name: '…SvgProps',
          type: 'SvgProps',
          value: '—',
          description: 'style, onPress, testID and any other react-native-svg prop.',
        },
  ]

  if (platform === 'web') {
    return {
      intro: `${component} is a typed React component. It renders an inline <svg>, works in Server and Client Components, and only ships if you import it.`,
      steps: [
        {
          title: 'Install',
          description: `Install the package from npm.`,
          language: 'bash',
          code: `pnpm add ${PACKAGE}`,
        },
        {
          title: 'Use it',
          description: colorAdvice,
          language: 'tsx',
          code: [
            `import { ${component} } from '${PACKAGE}'`,
            '',
            `export function ${component.replace(/Icon$/, '')}Label() {`,
            '  return (',
            `    <span className="inline-flex items-center gap-2 text-sm font-medium${multi ? '' : ' text-blue-600'}">`,
            `      <${component} size={${size}} title=${JSON.stringify(text)}${extraProps.length ? ` ${extraProps.join(' ')}` : ''} />`,
            `      ${text}`,
            '    </span>',
            '  )',
            '}',
          ].join('\n'),
        },
        {
          title: 'Or pick it by slug',
          description: `When the icon name comes from data (an API, the database or a CMS), render it with <Icon name="${meta.slug}" />. Unknown names show the fallback instead of crashing.`,
          language: 'tsx',
          code: [
            `import { Icon } from '${PACKAGE}'`,
            '',
            `// e.g. a menu item from the API: { label: ${JSON.stringify(text)}, icon: ${JSON.stringify(meta.slug)} }`,
            'export function MenuItem({ item }: { item: { label: string; icon: string } }) {',
            '  return (',
            '    <a className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-zinc-100">',
            `      <Icon name={item.icon} size={20} fallback={<span className="size-5" />} />`,
            '      {item.label}',
            '    </a>',
            '  )',
            '}',
          ].join('\n'),
        },
      ],
      table: { title: `${component} props`, rows },
    }
  }

  return {
    intro: `On React Native the same import resolves to a react-native-svg component with the same name and props. No extra import path is needed.`,
    steps: [
      {
        title: 'Install',
        description:
          'react-native-svg draws the icons. With Expo, expo install picks the matching version.',
        language: 'bash',
        code: ['npx expo install react-native-svg', `pnpm add ${PACKAGE}`].join('\n'),
      },
      {
        title: 'Use it',
        description: colorAdvice,
        language: 'tsx',
        code: [
          `import { Pressable, Text } from 'react-native'`,
          `import { ${component} } from '${PACKAGE}'`,
          '',
          `export function ${component.replace(/Icon$/, '')}Button({ onPress }: { onPress: () => void }) {`,
          '  return (',
          `    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>`,
          `      <${component}`,
          `        size={${size}}`,
          ...(multi ? [] : ['        color="#0091ff"']),
          `        title=${JSON.stringify(text)}`,
          ...colorPropsJsx(meta, '        '),
          '      />',
          `      <Text>${text}</Text>`,
          '    </Pressable>',
          '  )',
          '}',
        ].join('\n'),
      },
      {
        title: 'Or pick it by slug',
        description: `For data-driven lists, <Icon name="${meta.slug}" /> resolves the slug at runtime, with a fallback for unknown names.`,
        language: 'tsx',
        code: [
          `import { FlatList, Text, View } from 'react-native'`,
          `import { Icon } from '${PACKAGE}'`,
          '',
          `// items from the API: [{ label: ${JSON.stringify(text)}, icon: ${JSON.stringify(meta.slug)} }, …]`,
          'export function Menu({ items }: { items: { label: string; icon: string }[] }) {',
          '  return (',
          '    <FlatList',
          '      data={items}',
          '      keyExtractor={(item) => item.label}',
          '      renderItem={({ item }) => (',
          `        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }}>`,
          '          <Icon name={item.icon} size={20} fallback={<View style={{ width: 20 }} />} />',
          '          <Text>{item.label}</Text>',
          '        </View>',
          '      )}',
          '    />',
          '  )',
          '}',
        ].join('\n'),
      },
    ],
    table: { title: `${component} props`, rows },
  }
}

export function imageUsage(
  meta: Pick<ImageMeta, 'name' | 'slug' | 'alt' | 'width' | 'height' | 'bytes'>,
  platform: UsagePlatform
): UsageGuide {
  const exportName = toImageExportName(meta.slug)
  const alt = meta.alt.trim() || meta.name.trim() || 'Description'
  const half = Math.max(1, Math.round(meta.width / 2))
  const rows: UsageRow[] = [
    {
      name: 'export',
      type: platform === 'web' ? 'ImageAsset' : 'number',
      value: exportName,
      description: 'Named export of the package.',
    },
    { name: 'width', type: 'number', value: `${meta.width}px`, description: 'Read from the PNG.' },
    {
      name: 'height',
      type: 'number',
      value: `${meta.height}px`,
      description: 'Read from the PNG.',
    },
    {
      name: 'alt',
      type: 'string',
      value: meta.alt.trim() || '—',
      description: 'Suggested description from the studio.',
    },
  ]

  if (platform === 'web') {
    return {
      intro: `${exportName} is a static image object (src, width and height), so next/image sizes and optimizes it without extra props.`,
      steps: [
        {
          title: 'Install',
          description: `Install the package from npm.`,
          language: 'bash',
          code: `pnpm add ${PACKAGE}`,
        },
        {
          title: 'Let Next bundle the PNGs',
          description:
            'Once per app. Without it the Pages Router fails to load the .png files on the server.',
          language: 'tsx',
          code: [
            '// next.config.ts',
            'const nextConfig: NextConfig = {',
            `  transpilePackages: ['${PACKAGE}'],`,
            '}',
          ].join('\n'),
        },
        {
          title: 'Use it',
          description: `Rendered at ${meta.width}×${meta.height} by default. Set width (or height) to scale it; the other side follows.`,
          language: 'tsx',
          code: [
            `import Image from 'next/image'`,
            `import { ${exportName} } from '${PACKAGE}/images'`,
            '',
            `<Image src={${exportName}} alt=${JSON.stringify(alt)} />`,
            '',
            `// scaled down`,
            `<Image src={${exportName}} alt=${JSON.stringify(alt)} width={${half}} className="rounded-xl" />`,
          ].join('\n'),
        },
      ],
      table: { title: 'Image details', rows },
    }
  }

  return {
    intro: `On React Native the same import resolves to a Metro asset, ready for <Image source>.`,
    steps: [
      {
        title: 'Install',
        description: 'No extra native dependency is needed for images.',
        language: 'bash',
        code: `pnpm add ${PACKAGE}`,
      },
      {
        title: 'Use it',
        description: `Static assets render at their own size (${meta.width}×${meta.height}). Give a width and aspectRatio to scale it.`,
        language: 'tsx',
        code: [
          `import { Image } from 'react-native'`,
          `import { ${exportName} } from '${PACKAGE}/images'`,
          '',
          `<Image source={${exportName}} accessibilityLabel=${JSON.stringify(alt)} />`,
          '',
          '// scaled to fit a card',
          `<Image`,
          `  source={${exportName}}`,
          `  accessibilityLabel=${JSON.stringify(alt)}`,
          `  style={{ width: '100%', aspectRatio: ${meta.width} / ${meta.height} }}`,
          `  resizeMode="contain"`,
          `/>`,
        ].join('\n'),
      },
    ],
    table: { title: 'Image details', rows },
  }
}
