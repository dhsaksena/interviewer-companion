import type { Candidate, CandidateProfile } from '../../types'
import {
  formatDuration,
  formatPeriod,
  monthToYear,
  roleSpans,
  skillUsage,
  totalExperienceMonths,
  type RoleSpan,
} from '../../utils/candidateStats'

const TOP_SKILLS = 8

const StatTile = ({ label, value, note }: { label: string; value: string; note?: string }) => (
  <div className="cd-stat">
    <span className="cd-stat-label">{label}</span>
    <span className="cd-stat-value">{value}</span>
    {note && <span className="cd-stat-note">{note}</span>}
  </div>
)

// Gantt-style: one row per role on a shared year axis. Bars carry visible text labels
// (the past-role blue is below 3:1 contrast), and the experience list below is the table view.
const CareerTimeline = ({ spans, undated }: { spans: RoleSpan[]; undated: number }) => {
  const axisStart = monthToYear(Math.min(...spans.map(s => s.start))) * 12
  const axisEnd = (monthToYear(Math.max(...spans.map(s => s.end)) - 1) + 1) * 12
  const range = axisEnd - axisStart
  const years = range / 12
  const step = years <= 12 ? 1 : years <= 24 ? 2 : 5
  const ticks = Array.from({ length: Math.floor(years / step) + 1 }, (_, i) => axisStart / 12 + i * step)
  const pct = (month: number) => `${((month - axisStart) / range) * 100}%`

  return (
    <figure className="cd-timeline">
      <div className="cd-legend" aria-hidden="true">
        <span><i className="cd-key current" />Current role</span>
        <span><i className="cd-key" />Past role</span>
      </div>
      <div className="cd-tl-rows">
        {ticks.map(year => (
          <span key={year} className="cd-tl-grid" style={{ left: `calc(var(--cd-label-w) + (100% - var(--cd-label-w)) * ${(year * 12 - axisStart) / range})` }} />
        ))}
        {spans.map((span, i) => {
          const period = formatPeriod(span.role.startDate, span.role.endDate)
          const duration = formatDuration(span.end - span.start)
          return (
            <div key={i} className="cd-tl-row">
              <div className="cd-tl-label">
                <strong title={span.role.title}>{span.role.title}</strong>
                <span title={span.role.company}>{span.role.company}</span>
              </div>
              <div className="cd-tl-track">
                <span
                  className={`cd-tl-bar ${span.current ? 'current' : ''}`}
                  style={{ left: pct(span.start), width: `max(6px, ${((span.end - span.start) / range) * 100}%)` }}
                  tabIndex={0}
                  aria-label={`${span.role.title} at ${span.role.company}, ${period}, ${duration}`}
                >
                  <span className="cd-tip" role="tooltip">
                    <strong>{span.role.title}</strong>
                    <span>{span.role.company}</span>
                    <span>{period} · {duration}</span>
                  </span>
                </span>
              </div>
            </div>
          )
        })}
      </div>
      <div className="cd-tl-axis" aria-hidden="true">
        {ticks.map(year => (
          <span key={year} style={{ left: `${((year * 12 - axisStart) / range) * 100}%` }}>{year}</span>
        ))}
      </div>
      {undated > 0 && <figcaption className="cd-muted">{undated} role{undated === 1 ? '' : 's'} without dates not shown</figcaption>}
    </figure>
  )
}

// Horizontal bars, one series: how many roles mention each listed skill
const SkillsChart = ({ profile }: { profile: CandidateProfile }) => {
  const usage = skillUsage(profile).slice(0, TOP_SKILLS)
  if (usage.length === 0) return <p className="cd-muted">None of the listed skills are mentioned in the work history.</p>
  // Scaled to all roles, so a full bar means "used in every role"
  const roleCount = profile.experience.length

  return (
    <ul className="cd-bars" aria-label="Skills by number of roles that mention them">
      {usage.map(u => (
        <li key={u.skill} className="cd-bar-row">
          <span className="cd-bar-label" title={u.skill}>{u.skill}</span>
          <span className="cd-bar-track">
            <span
              className="cd-bar"
              // Scaled within the track minus room for the value label at the tip
              style={{ width: `calc((100% - 72px) * ${u.companies.length / roleCount})` }}
              tabIndex={0}
              aria-label={`${u.skill}: ${u.companies.length} of ${roleCount} roles (${u.companies.join(', ')})`}
            >
              <span className="cd-tip" role="tooltip">
                <strong>{u.skill}</strong>
                <span>Used at {u.companies.join(', ')}</span>
              </span>
            </span>
            <span className="cd-bar-value">{u.companies.length} of {roleCount}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}

// The tabular view: stats, timeline, skills chart and the full experience and education lists
const CandidateDetails = ({ candidate }: { candidate: Candidate }) => {
  const profile = candidate.profile
  const spans = roleSpans(profile.experience)
  const projectCount = profile.experience.reduce((n, r) => n + r.projects.length, 0)
  const companies = new Set(profile.experience.map(r => r.company.toLowerCase()).filter(Boolean)).size

  return (
    <>
    <div className="cd-stats">
      <StatTile label="Total experience" value={spans.length ? formatDuration(totalExperienceMonths(spans)) : '—'} note={spans.length ? 'Overlapping roles counted once' : 'No dated roles'} />
      <StatTile label="Roles" value={String(profile.experience.length)} note={`${companies} ${companies === 1 ? 'company' : 'companies'}`} />
      <StatTile label="Projects" value={String(projectCount)} />
      <StatTile label="Skills" value={String(profile.skills.length)} note={profile.certifications.length ? `${profile.certifications.length} certification${profile.certifications.length === 1 ? '' : 's'}` : undefined} />
    </div>

    {profile.summary && (
      <section className="cd-panel">
        <h3>Summary</h3>
        <p className="cd-summary">{profile.summary}</p>
      </section>
    )}

    <div className="cd-columns">
      <section className="cd-panel">
        <h3>Career timeline</h3>
        {spans.length > 0
          ? <CareerTimeline spans={spans} undated={profile.experience.length - spans.length} />
          : <p className="cd-muted">No dated roles on this resume.</p>}
      </section>

      <section className="cd-panel">
        <h3>Skills in practice</h3>
        <p className="cd-muted cd-sub">How many roles mention each listed skill</p>
        <SkillsChart profile={profile} />
        {profile.skills.length > 0 && (
          <>
            <h4>All skills</h4>
            <div className="cd-chips">{profile.skills.map(s => <span key={s} className="chip">{s}</span>)}</div>
          </>
        )}
        {profile.certifications.length > 0 && (
          <>
            <h4>Certifications</h4>
            <ul className="cd-list">{profile.certifications.map(c => <li key={c}>{c}</li>)}</ul>
          </>
        )}
      </section>
    </div>

    <section className="cd-panel">
      <h3>Experience</h3>
      {profile.experience.length === 0 && <p className="cd-muted">No work history found on this resume.</p>}
      <ol className="cd-roles">
        {profile.experience.map((role, i) => {
          const span = spans.find(s => s.role === role)
          return (
            <li key={i} className="cd-role">
              <div className="cd-role-head">
                <div>
                  <strong>{role.title}</strong>
                  <span className="cd-company">{role.company}</span>
                </div>
                <span className="cd-muted">
                  {formatPeriod(role.startDate, role.endDate) || 'Dates not stated'}
                  {span && ` · ${formatDuration(span.end - span.start)}`}
                </span>
                {span?.current && <span className="chip status-scheduled">Current</span>}
              </div>
              {role.description.length > 0 && <ul className="cd-list">{role.description.map((d, j) => <li key={j}>{d}</li>)}</ul>}
              {role.projects.map((project, j) => (
                <div key={j} className="cd-project">
                  <strong>{project.name}</strong>
                  {project.description && <p>{project.description}</p>}
                  {project.contributions.length > 0 && <ul className="cd-list">{project.contributions.map((c, k) => <li key={k}>{c}</li>)}</ul>}
                  {project.technologies.length > 0 && <div className="cd-chips">{project.technologies.map(t => <span key={t} className="chip">{t}</span>)}</div>}
                </div>
              ))}
            </li>
          )
        })}
      </ol>
    </section>

    <section className="cd-panel">
      <h3>Education</h3>
      {profile.education.length === 0 && <p className="cd-muted">No education listed.</p>}
      <ul className="cd-edu">
        {profile.education.map((edu, i) => (
          <li key={i}>
            <strong>{[edu.degree, edu.fieldOfStudy].filter(Boolean).join(', ') || edu.institution}</strong>
            {(edu.degree || edu.fieldOfStudy) && <span>{edu.institution}</span>}
            <span className="cd-muted">{formatPeriod(edu.startDate, edu.endDate)}</span>
          </li>
        ))}
      </ul>
    </section>
    </>
  )
}

export default CandidateDetails
