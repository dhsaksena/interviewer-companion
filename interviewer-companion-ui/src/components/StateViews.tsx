interface ErrorBoxProps {
  message: string
  onRetry?: () => void
}

export const ErrorBox = ({ message, onRetry }: ErrorBoxProps) => (
  <div className="alert alert-error error-box" role="alert">
    <span>{message}</span>
    {onRetry && <button type="button" className="btn btn-secondary" onClick={onRetry}>Retry</button>}
  </div>
)

// Placeholder rows while a list or page loads
export const LoadingState = ({ label, rows = 5 }: { label: string; rows?: number }) => (
  <div className="skeleton-list" role="status" aria-label={label}>
    {Array.from({ length: rows }, (_, i) => <div key={i} className="skeleton-row" />)}
  </div>
)
