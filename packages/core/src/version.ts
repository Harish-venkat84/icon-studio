export type VersionBump = 'patch' | 'minor' | 'major'

/** How a release affects apps: `breaking` removes or renames something they may import. */
export type ReleaseImpact = 'breaking' | 'feature' | 'fix'

function parse(version: string): [number, number, number] {
  const [major = 0, minor = 0, patch = 0] = version.split('-')[0]!.split('.').map(Number)
  return [major, minor, patch]
}

export function bumpVersion(version: string, bump: VersionBump): string {
  const [major, minor, patch] = parse(version)
  if (bump === 'major') return `${major + 1}.0.0`
  if (bump === 'minor') return `${major}.${minor + 1}.0`
  return `${major}.${minor}.${patch + 1}`
}

/** Whether `^from`, the range apps install with, also matches `to`. */
export function caretAccepts(from: string, to: string): boolean {
  const [a, b, c] = parse(from)
  const [x, y, z] = parse(to)
  if (a > 0) return x === a && (y > b || (y === b && z >= c))
  if (b > 0) return x === 0 && y === b && z >= c
  return x === 0 && y === 0 && z === c
}

/** The smallest bump for `impact`. Below 1.0.0 a minor bump is the breaking one, as npm treats it. */
export function recommendedBump(version: string, impact: ReleaseImpact): VersionBump {
  const [major] = parse(version)
  if (impact === 'breaking') return major > 0 ? 'major' : 'minor'
  if (impact === 'feature') return major > 0 ? 'minor' : 'patch'
  return 'patch'
}

/** Why `bump` is not allowed for a release with `impact`, or null when it is. */
export function bumpProblem(
  version: string,
  bump: VersionBump,
  impact: ReleaseImpact | null
): string | null {
  if (impact !== 'breaking') return null
  const target = bumpVersion(version, bump)
  if (!caretAccepts(version, target)) return null
  return `Apps on ^${version} would install ${target} automatically, but it removes or renames exports they may use. Release ${bumpVersion(version, recommendedBump(version, impact))} instead.`
}
