import { useMemo, type KeyboardEvent } from 'react'
import { MdWork, MdSchool, MdLightbulbOutline, MdBolt, MdPublic } from 'react-icons/md'
import type { CandidateProfile } from '../../types'
import { buildCandidateGraph, GRAPH, type GraphCategory, type GraphLeaf } from '../../utils/candidateGraph'
import { initialsOf } from '../../utils/candidateStats'

export type NodeRunStatus = 'running' | 'done' | 'failed'

const ICONS: Record<GraphCategory, typeof MdWork> = {
  career: MdWork,
  education: MdSchool,
  projects: MdLightbulbOutline,
  skills: MdBolt,
  online: MdPublic,
}

const truncate = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text)

interface CandidateGraphProps {
  profile: CandidateProfile
  selectedId: string | null
  statuses: Record<string, NodeRunStatus>
  onSelect: (targetId: string) => void
  onShowDetails: () => void
}

const StatusBadge = ({ status, x, y }: { status?: NodeRunStatus; x: number; y: number }) => {
  if (!status) return null
  return (
    <g transform={`translate(${x} ${y})`} className={`cg-badge ${status}`} aria-hidden="true">
      {status === 'running' && <circle r="7" className="cg-spin" />}
      {status === 'done' && (
        <>
          <circle r="8" />
          <path d="M -3.5 0 L -1 2.6 L 3.8 -2.6" />
        </>
      )}
      {status === 'failed' && (
        <>
          <circle r="8" />
          <path d="M 0 -4 L 0 1" />
          <circle r="0.9" cy="3.6" className="cg-dot" />
        </>
      )}
    </g>
  )
}

const statusText = (status?: NodeRunStatus) =>
  status === 'running' ? ', deep dive running' : status === 'done' ? ', deep dive done' : status === 'failed' ? ', deep dive failed' : ''

const CandidateGraph = ({ profile, selectedId, statuses, onSelect, onShowDetails }: CandidateGraphProps) => {
  const graph = useMemo(() => buildCandidateGraph(profile), [profile])

  const activate = (leaf: GraphLeaf) => (leaf.deepDive ? onSelect(leaf.id) : onShowDetails())
  const onKey = (e: KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); action() }
  }

  const { center } = graph
  const centerStatus = statuses.candidate

  return (
    <svg
      className="cg-svg"
      viewBox={`0 0 ${graph.width} ${graph.height}`}
      role="group"
      aria-label={`Graph of ${profile.fullName}'s profile. Select a node to run a deep dive on it.`}
    >
      <g className="cg-edges" aria-hidden="true">
        {graph.edges.map(edge => <path key={edge.id} d={edge.path} />)}
      </g>

      {graph.hubs.map(hub => {
        const Icon = ICONS[hub.category]
        const left = hub.x - GRAPH.hubWidth / 2
        return (
          <g key={hub.category} className={`cg-hub cat-${hub.category} ${hub.count === 0 ? 'empty' : ''}`} aria-hidden="true">
            <rect x={left} y={hub.y - GRAPH.hubHeight / 2} width={GRAPH.hubWidth} height={GRAPH.hubHeight} rx={GRAPH.hubHeight / 2} />
            <g transform={`translate(${left + 12} ${hub.y - 9})`}><Icon size={18} className="cg-hub-icon" /></g>
            <text x={left + 36} y={hub.y + 5} className="cg-hub-label">{hub.label}</text>
            <text x={left + GRAPH.hubWidth - 14} y={hub.y + 5} textAnchor="end" className="cg-hub-count">{hub.count}</text>
          </g>
        )
      })}

      {graph.leaves.map(leaf => {
        const status = statuses[leaf.id]
        const top = leaf.y - GRAPH.leafHeight / 2
        return (
          <g
            key={leaf.id}
            className={`cg-node cat-${leaf.category} ${selectedId === leaf.id ? 'selected' : ''} ${leaf.deepDive ? '' : 'more'}`}
            role="button"
            tabIndex={0}
            aria-pressed={leaf.deepDive ? selectedId === leaf.id : undefined}
            aria-label={leaf.deepDive ? `${leaf.tooltip}. Run deep dive${statusText(status)}` : leaf.tooltip}
            onClick={() => activate(leaf)}
            onKeyDown={e => onKey(e, () => activate(leaf))}
          >
            <title>{leaf.tooltip}</title>
            <rect x={leaf.x} y={top} width={GRAPH.leafWidth} height={GRAPH.leafHeight} rx="8" />
            <circle cx={leaf.x + 14} cy={leaf.y} r="5" className="cg-swatch" />
            <text x={leaf.x + 27} y={leaf.y - 3} className="cg-label">{truncate(leaf.label, 23)}</text>
            <text x={leaf.x + 27} y={leaf.y + 11} className="cg-sublabel">{truncate(leaf.sublabel, 28)}</text>
            <StatusBadge status={status} x={leaf.x + GRAPH.leafWidth - 15} y={leaf.y} />
          </g>
        )
      })}

      <g
        className={`cg-center ${selectedId === 'candidate' ? 'selected' : ''}`}
        role="button"
        tabIndex={0}
        aria-pressed={selectedId === 'candidate'}
        aria-label={`${profile.fullName}. Run identity deep dive${statusText(centerStatus)}`}
        onClick={() => onSelect('candidate')}
        onKeyDown={e => onKey(e, () => onSelect('candidate'))}
      >
        <title>{profile.fullName}{profile.headline ? ` · ${profile.headline}` : ''}</title>
        <circle cx={center.x} cy={center.y} r={GRAPH.centerRadius} />
        <text x={center.x} y={center.y + 8} textAnchor="middle" className="cg-initials">{initialsOf(profile.fullName)}</text>
        <text x={center.x} y={center.y + GRAPH.centerRadius + 20} textAnchor="middle" className="cg-name">{truncate(profile.fullName, 26)}</text>
        {profile.headline && (
          <text x={center.x} y={center.y + GRAPH.centerRadius + 36} textAnchor="middle" className="cg-sublabel">{truncate(profile.headline, 32)}</text>
        )}
        <StatusBadge status={centerStatus} x={center.x + GRAPH.centerRadius * 0.72} y={center.y - GRAPH.centerRadius * 0.72} />
      </g>
    </svg>
  )
}

export default CandidateGraph
