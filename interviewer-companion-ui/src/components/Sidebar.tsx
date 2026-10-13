import { useState, useEffect, useCallback } from 'react'
import './Sidebar.css'
import type { CategoryRecord, SubcategoryRecord } from '../types'
import {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  createSubcategory,
  updateSubcategory,
  deleteSubcategory,
} from '../api/categoriesApi'
import { NameDialog, ConfirmDialog, type NameDialogProps, type ConfirmDialogProps } from './CategoryDialogs'
import { AiOutlineHome } from 'react-icons/ai'
import { BsQuestionCircle } from 'react-icons/bs'
import { MdKeyboardArrowRight, MdAdd, MdEdit, MdDelete, MdMenuOpen, MdMenu } from 'react-icons/md'

interface SidebarProps {
  selectedCategory: string | null
  onSelectCategory: (category: string | null) => void
  onSelectSubcategory?: (subcategory: string) => void
  activeNav: 'home' | 'all' | null
  onGoHome: () => void
  onShowAll: () => void
  onSubcategoryDeleted?: (subcategory: string) => void
}

type NameDialogConfig = Omit<NameDialogProps, 'onClose'>
type ConfirmDialogConfig = Omit<ConfirmDialogProps, 'onClose'>

const DEFAULT_WIDTH = 260
const MIN_WIDTH = 220
const MAX_WIDTH = 500
const KEYBOARD_STEP = 16
const WIDTH_STORAGE_KEY = 'sidebarWidth'
const COLLAPSED_STORAGE_KEY = 'sidebarCollapsed'
const COLLAPSED_WIDTH = 52

const clampWidth = (width: number) => Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, width))

const loadStoredWidth = () => {
  const stored = Number(localStorage.getItem(WIDTH_STORAGE_KEY))
  return stored ? clampWidth(stored) : DEFAULT_WIDTH
}

const Sidebar = ({ selectedCategory, onSelectCategory, onSelectSubcategory, onSubcategoryDeleted, activeNav, onGoHome, onShowAll }: SidebarProps) => {
  const [categories, setCategories] = useState<CategoryRecord[]>([])
  // Keyed by category id; categories default to expanded until toggled
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nameDialog, setNameDialog] = useState<NameDialogConfig | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogConfig | null>(null)
  const [width, setWidth] = useState(loadStoredWidth)
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSED_STORAGE_KEY) === '1')

  useEffect(() => {
    localStorage.setItem(WIDTH_STORAGE_KEY, String(width))
  }, [width])

  useEffect(() => {
    localStorage.setItem(COLLAPSED_STORAGE_KEY, collapsed ? '1' : '0')
  }, [collapsed])

  const handleResizeStart = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = width

    const handleMove = (moveEvent: PointerEvent) => {
      setWidth(clampWidth(startWidth + moveEvent.clientX - startX))
    }
    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    // Keep the resize cursor and block text selection while dragging, even off the handle
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
  }

  const handleResizeKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') setWidth(w => clampWidth(w - KEYBOARD_STEP))
    else if (e.key === 'ArrowRight') setWidth(w => clampWidth(w + KEYBOARD_STEP))
  }

  const reportLoadError = (err: unknown) => {
    setError(err instanceof Error ? err.message : 'Failed to fetch categories')
    console.error('Error fetching categories:', err)
  }

  // Refetch after a change; updates the list in place (no loading flash)
  const loadCategories = async () => {
    try {
      setCategories(await fetchCategories())
      setError(null)
    } catch (err) {
      reportLoadError(err)
    }
  }

  useEffect(() => {
    fetchCategories()
      .then(setCategories)
      .catch(reportLoadError)
      .finally(() => setLoading(false))
  }, [])

  const isExpanded = (categoryId: number) => expanded[categoryId] ?? true

  const toggleCategory = (categoryId: number) => {
    setExpanded(prev => ({ ...prev, [categoryId]: !(prev[categoryId] ?? true) }))
  }

  const handleSelectSubcategory = (subcategoryName: string) => {
    onSelectCategory(subcategoryName)
    onSelectSubcategory?.(subcategoryName)
  }

  const closeNameDialog = useCallback(() => setNameDialog(null), [])
  const closeConfirmDialog = useCallback(() => setConfirmDialog(null), [])

  const openAddCategory = () => setNameDialog({
    title: 'Add category',
    label: 'Category name',
    initialValue: '',
    submitLabel: 'Add',
    onSubmit: async name => {
      await createCategory(name)
      await loadCategories()
    },
  })

  const openRenameCategory = (category: CategoryRecord) => setNameDialog({
    title: 'Rename category',
    label: 'Category name',
    initialValue: category.name,
    submitLabel: 'Save',
    onSubmit: async name => {
      await updateCategory(category.id, name)
      await loadCategories()
    },
  })

  const openDeleteCategory = (category: CategoryRecord) => setConfirmDialog({
    title: 'Delete category',
    message: `Delete "${category.name}" and its ${category.subcategories.length} subcategor${category.subcategories.length === 1 ? 'y' : 'ies'}? This is only allowed when it has no questions.`,
    confirmLabel: 'Delete',
    onConfirm: async () => {
      await deleteCategory(category.id)
      await loadCategories()
    },
  })

  const openAddSubcategory = (category: CategoryRecord) => setNameDialog({
    title: `Add subcategory to ${category.name}`,
    label: 'Subcategory name',
    initialValue: '',
    submitLabel: 'Add',
    onSubmit: async name => {
      await createSubcategory(category.id, name)
      setExpanded(prev => ({ ...prev, [category.id]: true }))
      await loadCategories()
    },
  })

  const openRenameSubcategory = (subcategory: SubcategoryRecord) => setNameDialog({
    title: 'Rename subcategory',
    label: 'Subcategory name',
    initialValue: subcategory.name,
    submitLabel: 'Save',
    onSubmit: async name => {
      await updateSubcategory(subcategory.id, name)
      // Re-select under the new name so the open question list follows the rename
      if (selectedCategory === subcategory.name) handleSelectSubcategory(name)
      await loadCategories()
    },
  })

  const openDeleteSubcategory = (subcategory: SubcategoryRecord) => setConfirmDialog({
    title: 'Delete subcategory',
    message: `Delete "${subcategory.name}"? This is only allowed when it has no questions.`,
    confirmLabel: 'Delete',
    onConfirm: async () => {
      await deleteSubcategory(subcategory.id)
      if (selectedCategory === subcategory.name) onSelectCategory(null)
      onSubcategoryDeleted?.(subcategory.name)
      await loadCategories()
    },
  })

  if (collapsed) {
    return (
      <div className="sidebar-wrapper" style={{ width: COLLAPSED_WIDTH }}>
        <div className="sidebar collapsed">
          <button type="button" className="sidebar-icon-btn" onClick={() => setCollapsed(false)} title="Expand sidebar" aria-label="Expand sidebar">
            <MdMenu />
          </button>
          <button type="button" className={`sidebar-icon-btn ${activeNav === 'home' ? 'active' : ''}`} onClick={onGoHome} title="Home" aria-label="Home">
            <AiOutlineHome />
          </button>
          <button type="button" className={`sidebar-icon-btn ${activeNav === 'all' ? 'active' : ''}`} onClick={onShowAll} title="All questions" aria-label="All questions">
            <BsQuestionCircle />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="sidebar-wrapper" style={{ width }}>
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="logo" onClick={onGoHome}>
          <span className="logo-icon">📋</span>
          <span>Interview Companion</span>
        </div>
        <button type="button" className="sidebar-icon-btn" onClick={() => setCollapsed(true)} title="Collapse sidebar" aria-label="Collapse sidebar">
          <MdMenuOpen />
        </button>
      </div>

      <nav className="sidebar-nav">
        <button type="button" className={`nav-item ${activeNav === 'home' ? 'active' : ''}`} onClick={onGoHome}>
          <span className="nav-icon"><AiOutlineHome /></span>
          <span>Home</span>
        </button>
        <button type="button" className={`nav-item ${activeNav === 'all' ? 'active' : ''}`} onClick={onShowAll}>
          <span className="nav-icon"><BsQuestionCircle /></span>
          <span>All Questions</span>
        </button>
      </nav>

      <div className="categories-section">
        <h3 className="section-title">Categories</h3>

        {loading && <p className="loading">Loading categories...</p>}
        {error && <p className="error">Error: {error}</p>}

        {!loading && !error && categories.length === 0 && (
          <p className="empty-hint">No categories yet</p>
        )}

        {!loading && !error && categories.map(category => {
          const open = isExpanded(category.id)
          return (
            <div key={category.id} className="category-group">
              <div
                className="category-header"
                role="button"
                tabIndex={0}
                aria-expanded={open}
                onClick={() => toggleCategory(category.id)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleCategory(category.id) } }}
              >
                <MdKeyboardArrowRight
                  className={`chevron ${open ? 'expanded' : ''}`}
                />
                <span className="category-name">{category.name}</span>
                <div className="item-actions">
                  <button
                    type="button"
                    className="item-action-btn"
                    title="Add subcategory"
                    aria-label={`Add subcategory to ${category.name}`}
                    onClick={e => { e.stopPropagation(); openAddSubcategory(category) }}
                  >
                    <MdAdd />
                  </button>
                  <button
                    type="button"
                    className="item-action-btn"
                    title="Rename category"
                    aria-label={`Rename ${category.name}`}
                    onClick={e => { e.stopPropagation(); openRenameCategory(category) }}
                  >
                    <MdEdit />
                  </button>
                  <button
                    type="button"
                    className="item-action-btn danger"
                    title="Delete category"
                    aria-label={`Delete ${category.name}`}
                    onClick={e => { e.stopPropagation(); openDeleteCategory(category) }}
                  >
                    <MdDelete />
                  </button>
                </div>
              </div>

              {open && (
                <div className="subcategories">
                  {category.subcategories.length === 0 && (
                    <p className="empty-hint">No subcategories</p>
                  )}
                  {category.subcategories.map(subcategory => (
                    <div
                      key={subcategory.id}
                      className={`subcategory-item ${
                        selectedCategory === subcategory.name ? 'selected' : ''
                      }`}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSelectSubcategory(subcategory.name)}
                      onKeyDown={e => { if (e.key === 'Enter') handleSelectSubcategory(subcategory.name) }}
                    >
                      <MdKeyboardArrowRight className="subcategory-arrow" />
                      <span className="subcategory-name">{subcategory.name}</span>
                      <div className="item-actions">
                        <button
                          type="button"
                          className="item-action-btn"
                          title="Rename subcategory"
                          aria-label={`Rename ${subcategory.name}`}
                          onClick={e => { e.stopPropagation(); openRenameSubcategory(subcategory) }}
                        >
                          <MdEdit />
                        </button>
                        <button
                          type="button"
                          className="item-action-btn danger"
                          title="Delete subcategory"
                          aria-label={`Delete ${subcategory.name}`}
                          onClick={e => { e.stopPropagation(); openDeleteSubcategory(subcategory) }}
                        >
                          <MdDelete />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="sidebar-buttons">
        <button type="button" className="add-category-btn" onClick={openAddCategory}>+ Add Category</button>
      </div>

      {nameDialog && <NameDialog {...nameDialog} onClose={closeNameDialog} />}
      {confirmDialog && <ConfirmDialog {...confirmDialog} onClose={closeConfirmDialog} />}
    </div>

    <div
      className="sidebar-resizer"
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize sidebar"
      aria-valuenow={width}
      aria-valuemin={MIN_WIDTH}
      aria-valuemax={MAX_WIDTH}
      tabIndex={0}
      title="Drag to resize (double-click to reset)"
      onPointerDown={handleResizeStart}
      onKeyDown={handleResizeKeyDown}
      onDoubleClick={() => setWidth(DEFAULT_WIDTH)}
    />
    </div>
  )
}

export default Sidebar
