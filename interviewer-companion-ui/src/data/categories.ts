import type { Category } from '../types'

export const SIDEBAR_CATEGORIES: Record<string, Category> = {
  Backend: {
    name: 'Backend',
    expanded: true,
    subcategories: ['Java', 'Python', 'System Design', 'APIs & Microservices']
  },
  Frontend: {
    name: 'Frontend',
    expanded: true,
    subcategories: ['React', 'JavaScript', 'CSS', 'HTML']
  },
  'Data Engineering': {
    name: 'Data Engineering',
    expanded: true,
    subcategories: ['Spark', 'Hadoop', 'DB2', 'Data Modeling', 'ETL/ELT']
  },
}