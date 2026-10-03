export type Difficulty = 'Easy' | 'Medium' | 'Hard'
export type QuestionType = 'Conceptual' | 'Coding' | 'Scenario' | 'Behavioural'

export interface Question {
    id: string
    title: string
    category: string
    difficulty: Difficulty
    type: QuestionType
    viewedAt?: Date
}

export interface Category {
  name: string
  expanded: boolean
  subcategories: string[]
}