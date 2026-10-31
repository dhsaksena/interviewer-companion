import type { ExtractedItem, ProgressListener, ProgressStep, StepStatus } from '../types/progress.js'

interface StepUpdate {
  percent: number
  message: string
  detail?: string
}

// Keeps the ordered step list for a long-running job and reports every change to the listener
export class ProgressTracker {
  private steps: ProgressStep[]
  private items: ExtractedItem[] | undefined
  private percent = 0
  private message = ''

  constructor(steps: { key: string; label: string }[], private listener?: ProgressListener) {
    this.steps = steps.map(step => ({ ...step, status: 'pending' }))
  }

  step(key: string, status: StepStatus, { percent, message, detail }: StepUpdate) {
    this.steps = this.steps.map(step => (step.key === key ? { ...step, status, detail: detail ?? step.detail } : step))
    this.percent = Math.max(this.percent, percent)
    this.message = message
    this.emit()
  }

  setItems(items: ExtractedItem[], { percent, message }: StepUpdate) {
    this.items = items
    this.percent = Math.max(this.percent, percent)
    this.message = message
    this.emit()
  }

  // Marks whichever step was running as failed, so the client shows where it stopped
  failActive() {
    this.steps = this.steps.map(step => (step.status === 'active' ? { ...step, status: 'failed' } : step))
    this.emit()
  }

  private emit() {
    this.listener?.({
      percent: Math.round(this.percent),
      message: this.message,
      steps: this.steps,
      ...(this.items && { items: this.items }),
    })
  }
}
