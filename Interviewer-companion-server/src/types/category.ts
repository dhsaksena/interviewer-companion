export interface Subcategory {
  id: number
  category_id: number
  name: string
  question_count?: number
  created_at: Date
  updated_at: Date
}

export interface Category {
  id: number
  name: string
  description?: string
  subcategories: Subcategory[]
  created_at: Date
  updated_at: Date
}

export interface CreateCategoryInput {
  name: string
  description?: string
  subcategories?: string[]
}

export interface UpdateCategoryInput {
  name?: string
  description?: string
}
