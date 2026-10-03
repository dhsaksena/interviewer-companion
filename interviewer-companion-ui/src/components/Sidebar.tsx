import { useState, useEffect } from 'react'
import './Sidebar.css'
import type { Category } from '../types'
import { AiOutlineHome } from 'react-icons/ai'
import { BsQuestionCircle, BsBookmark, BsClock, BsShuffle } from 'react-icons/bs'
import { MdKeyboardArrowRight } from 'react-icons/md'

interface SidebarProps {
  selectedCategory: string | null
  onSelectCategory: (category: string | null) => void
  onAddQuestion?: () => void
  onSelectSubcategory?: (subcategory: string) => void
}

const NAV_ITEMS = [
  { label: 'Home', iconName: 'home', active: true },
  { label: 'All Questions', iconName: 'questions', active: false },
  { label: 'Saved Questions', iconName: 'saved', active: false },
  { label: 'My Sessions', iconName: 'sessions', active: false },
  { label: 'Random Practice', iconName: 'random', active: false },
]

const getNavIcon = (iconName: string) => {
  switch (iconName) {
    case 'home':      return <AiOutlineHome />
    case 'questions': return <BsQuestionCircle />
    case 'saved':     return <BsBookmark />
    case 'sessions':  return <BsClock />
    case 'random':    return <BsShuffle />
    default:          return null
  }
}

const Sidebar = ({ selectedCategory, onSelectCategory, onAddQuestion, onSelectSubcategory }: SidebarProps) => {
  const [categories, setCategories] = useState<Record<string, Category>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true)
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
        const response = await fetch(`${apiUrl}/categories`)
        if (!response.ok) {
          throw new Error(`Failed to fetch categories: ${response.statusText}`)
        }
        const data = await response.json()

        const categoriesMap: Record<string, Category> = {}
        data.forEach((cat: any) => {
          categoriesMap[cat.name] = {
            name: cat.name,
            expanded: true,
            subcategories: cat.subcategories.map((sub: any) => sub.name)
          }
        })
        setCategories(categoriesMap)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch categories')
        console.error('Error fetching categories:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchCategories()
  }, [])

  const toggleCategory = (categoryName: string) => {
    setCategories({
      ...categories,
      [categoryName]: {
        ...categories[categoryName],
        expanded: !categories[categoryName].expanded
      }
    })
  }

  const handleSelectSubcategory = (subcategoryName: string) => {
    onSelectCategory(subcategoryName)
    onSelectSubcategory?.(subcategoryName)
  }

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="logo">
          <span className="logo-icon">📋</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map(item => (
          <a
            key={item.label}
            href="#"
            className={`nav-item ${item.active ? 'active' : ''}`}
          >
            <span className="nav-icon">{getNavIcon(item.iconName)}</span>
            <span>{item.label}</span>
          </a>
        ))}
      </nav>

      <div className="categories-section">
        <h3 className="section-title">Categories</h3>

        {loading && <p className="loading">Loading categories...</p>}
        {error && <p className="error">Error: {error}</p>}

        {!loading && !error && Object.entries(categories).map(([categoryKey, category]) => (
          <div key={categoryKey} className="category-group">
            <div
              className="category-header"
              onClick={() => toggleCategory(categoryKey)}
            >
              <MdKeyboardArrowRight
                className={`chevron ${category.expanded ? 'expanded' : ''}`}
              />
              <span className="category-name">{category.name}</span>
            </div>

            {category.expanded && (
              <div className="subcategories">
                {category.subcategories.map(subcategory => (
                  <div
                    key={subcategory}
                    className={`subcategory-item ${
                      selectedCategory === subcategory ? 'selected' : ''
                    }`}
                    onClick={() => handleSelectSubcategory(subcategory)}
                  >
                    <MdKeyboardArrowRight className="subcategory-arrow" />
                    {subcategory}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="sidebar-buttons">
        <button className="add-question-btn" onClick={onAddQuestion}>
          + Add Question
        </button>
        <button className="add-category-btn">+ Add Category</button>
      </div>
    </div>
  )
}

export default Sidebar
