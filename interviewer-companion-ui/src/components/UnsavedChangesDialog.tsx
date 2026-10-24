import { usePendingNavigation } from '../router'
import { ConfirmDialog } from './CategoryDialogs'

// Shown when the user tries to leave a page that has unsaved changes
const UnsavedChangesDialog = () => {
  const { hasPending, stay, leave } = usePendingNavigation()
  if (!hasPending) return null
  return (
    <ConfirmDialog
      title="Discard unsaved changes?"
      message="You have changes that haven't been saved. If you leave now they will be lost."
      confirmLabel="Discard and leave"
      cancelLabel="Keep editing"
      busyLabel="Leaving..."
      tone="primary"
      onConfirm={async () => leave()}
      onClose={stay}
    />
  )
}

export default UnsavedChangesDialog
