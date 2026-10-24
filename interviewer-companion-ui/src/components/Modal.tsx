import { useEffect, useRef, type ReactNode } from 'react'
import './CategoryDialogs.css'

interface ModalProps {
  title: string
  onClose: () => void
  // Dialogs holding typed input should not vanish on a stray click outside
  closeOnOverlay?: boolean
  className?: string
  children: ReactNode
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

// Shared dialog shell: Escape closes, Tab stays inside, focus returns to the trigger afterwards
const Modal = ({ title, onClose, closeOnOverlay = true, className = 'dialog', children }: ModalProps) => {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const panel = panelRef.current
    if (panel && !panel.contains(document.activeElement)) panel.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'Tab' && panel) {
        const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE))
        if (items.length === 0) return
        const first = items[0]
        const last = items[items.length - 1]
        if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      previous?.focus?.()
    }
  }, [onClose])

  return (
    <div
      className="dialog-overlay"
      // mousedown (not click) so a text selection dragged out of the dialog doesn't close it
      onMouseDown={e => { if (closeOnOverlay && e.target === e.currentTarget) onClose() }}
    >
      <div ref={panelRef} className={className} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}>
        {children}
      </div>
    </div>
  )
}

export default Modal
