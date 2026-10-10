import type { CategoryRecord } from '../types'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const request = async (path: string, options: RequestInit = {}) => {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json' },
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.error ?? `Request failed: ${response.statusText}`)
  }

  return response.status === 204 ? null : response.json()
}

const jsonBody = (body: object) => JSON.stringify(body)

export const fetchCategories = (): Promise<CategoryRecord[]> => request('/categories')

export const createCategory = (name: string) =>
  request('/categories', { method: 'POST', body: jsonBody({ name }) })

export const updateCategory = (id: number, name: string) =>
  request(`/categories/${id}`, { method: 'PUT', body: jsonBody({ name }) })

export const deleteCategory = (id: number) =>
  request(`/categories/${id}`, { method: 'DELETE' })

export const createSubcategory = (categoryId: number, name: string) =>
  request(`/categories/${categoryId}/subcategories`, { method: 'POST', body: jsonBody({ name }) })

export const updateSubcategory = (id: number, name: string) =>
  request(`/subcategories/${id}`, { method: 'PUT', body: jsonBody({ name }) })

export const deleteSubcategory = (id: number) =>
  request(`/subcategories/${id}`, { method: 'DELETE' })
