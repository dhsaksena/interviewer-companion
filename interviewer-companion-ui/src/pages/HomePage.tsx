import { useEffect, useState } from 'react'
import '../styles/HomePage.css'
import { MdFolderOpen } from 'react-icons/md'
import type { CategoryRecord } from '../types'
import { fetchCategories } from '../api/categoriesApi'

interface HomePageProps {
  onSelectSubcategory: (subcategory: string) => void
  onShowAll: () => void
}

const HomePage = ({ onSelectSubcategory, onShowAll }: HomePageProps) => {
  const [categories, setCategories] = useState<CategoryRecord[] | null>(null)

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => setCategories([]))
  }, [])

  return (
    <div className="page">
      <div className="page-body">
        <div className="home-column">
          <h1 className="home-title">Interview Companion</h1>
          <p className="home-subtitle">Pick a topic to browse its questions, or add a new one from inside a topic.</p>

          <button type="button" className="btn btn-primary" onClick={onShowAll}>Browse all questions</button>

          {categories === null && <div className="state-box">Loading...</div>}

          {categories?.length === 0 && (
            <div className="state-box">
              <MdFolderOpen className="state-icon" />
              <p className="state-title">No categories yet</p>
              <p>Create one with “+ Add Category” in the sidebar.</p>
            </div>
          )}

          <div className="home-grid">
            {categories?.map(category => (
              <section key={category.id} className="home-card">
                <h2>{category.name}</h2>
                {category.subcategories.length === 0 ? (
                  <p className="home-empty">No subcategories</p>
                ) : (
                  <div className="home-chips">
                    {category.subcategories.map(sub => (
                      <button key={sub.id} type="button" className="topic-chip" onClick={() => onSelectSubcategory(sub.name)}>
                        {sub.name}
                      </button>
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default HomePage
