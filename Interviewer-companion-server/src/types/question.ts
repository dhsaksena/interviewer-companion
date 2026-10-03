export interface Question {
  id: string
  title: string
  description: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  type: 'Conceptual' | 'Coding' | 'Scenario' | 'Behavioural'
  category_id: number
  subcategory_id: number
  category?: string
  subcategory?: string
  solution?: string
  solution_image_url?: string
  created_at?: Date
  updated_at?: Date
  tags?: string[]
}

export interface CreateQuestionInput {
  title: string
  description: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  type: 'Conceptual' | 'Coding' | 'Scenario' | 'Behavioural'
  category: string
  subcategory: string
  solution?: string
  solutionImageUrl?: string
  solution_image_url?: string
  tags?: string[]
  category_id?: number
  subcategory_id?: number
}

export interface UpdateQuestionInput {
  title?: string
  description?: string
  difficulty?: 'Easy' | 'Medium' | 'Hard'
  type?: 'Conceptual' | 'Coding' | 'Scenario' | 'Behavioural'
  category?: string
  subcategory?: string
  solution?: string
  solutionImageUrl?: string
  solution_image_url?: string
  tags?: string[]
  category_id?: number
  subcategory_id?: number
}

export interface GetQuestionsFilters {
  difficulty?: string[]
  type?: string[]
  category?: string
  subcategory?: string
  search?: string
}
