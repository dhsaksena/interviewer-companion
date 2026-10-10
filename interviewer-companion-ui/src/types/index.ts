export type Difficulty = 'Easy' | 'Medium' | 'Hard'
export type QuestionType = 'Conceptual' | 'Coding' | 'Scenario' | 'Behavioural'

export interface Question {
    id: number
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

export interface SubcategoryRecord {
  id: number
  name: string
}

export interface CategoryRecord {
  id: number
  name: string
  subcategories: SubcategoryRecord[]
}