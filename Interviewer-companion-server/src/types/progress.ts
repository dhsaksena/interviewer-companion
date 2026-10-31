// Progress events streamed to the client (Server-Sent Events) by resume import and deep dives

export type StepStatus = 'pending' | 'active' | 'done' | 'failed'

export interface ProgressStep {
  key: string
  label: string
  status: StepStatus
  // e.g. "2 pages · 4,210 characters"
  detail?: string
}

// One section of the extracted profile, with how many entries have been found so far
export interface ExtractedItem {
  key: string
  label: string
  status: StepStatus
  count?: number
}

export interface ProgressEvent {
  percent: number
  message: string
  steps: ProgressStep[]
  items?: ExtractedItem[]
}

export type ProgressListener = (event: ProgressEvent) => void
