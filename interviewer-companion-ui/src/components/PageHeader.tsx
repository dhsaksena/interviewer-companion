import type { ReactNode } from 'react'
import { MdArrowBack } from 'react-icons/md'

export interface Crumb {
  label: string
  onClick?: () => void
}

interface PageHeaderProps {
  title: string
  crumbs?: Crumb[]
  onBack?: () => void
  backDisabled?: boolean
  actions?: ReactNode
}

const PageHeader = ({ title, crumbs, onBack, backDisabled, actions }: PageHeaderProps) => (
  <header className="page-header">
    {onBack && (
      <button type="button" className="icon-btn" onClick={onBack} disabled={backDisabled} title="Back" aria-label="Back">
        <MdArrowBack />
      </button>
    )}
    <div className="page-header-main">
      {crumbs && crumbs.length > 0 && (
        <nav className="breadcrumb" aria-label="Breadcrumb">
          {crumbs.map((crumb, i) => (
            <span key={i} style={{ display: 'contents' }}>
              {i > 0 && <span className="breadcrumb-sep">›</span>}
              {crumb.onClick ? (
                <button type="button" className="breadcrumb-link" onClick={crumb.onClick}>{crumb.label}</button>
              ) : (
                <span className="breadcrumb-current">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <h1 title={title}>{title}</h1>
    </div>
    {actions && <div className="page-header-actions">{actions}</div>}
  </header>
)

export default PageHeader
