import { useState } from 'react'
import './App.css'
import Sidebar from './components/Sidebar'
import AddQuestionPage from './pages/AddQuestionPage'
import QuestionsListPage from './pages/QuestionsListPage'
import QuestionEditPage from './pages/QuestionEditPage'
import QuestionViewPage from './pages/QuestionViewPage'
import HomePage from './pages/HomePage'

type PageType = 'home' | 'add-question' | 'questions-list' | 'edit-question' | 'view-question'

function App()
{
  // Name of the subcategory highlighted in the sidebar
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState<PageType>('home')
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null)
  const [selectedQuestionId, setSelectedQuestionId] = useState<number | null>(null)

  const handleBackToHome = () => {
    setCurrentPage('home')
    setSelectedCategory(null)
    setSelectedSubcategory(null)
    setSelectedQuestionId(null)
  }

  const handleShowAll = () => {
    setSelectedCategory(null)
    setSelectedSubcategory(null)
    setSelectedQuestionId(null)
    setCurrentPage('questions-list')
  }

  const handleSelectSubcategory = (subcategory: string) => {
    setSelectedCategory(subcategory)
    setSelectedSubcategory(subcategory)
    setCurrentPage('questions-list')
  }

  const handleSelectQuestion = (questionId: number) => {
    setSelectedQuestionId(questionId)
    setCurrentPage('edit-question')
  }

  const handleViewQuestion = (questionId: number) => {
    setSelectedQuestionId(questionId)
    setCurrentPage('view-question')
  }

  // The list page is shared by "All questions" (no subcategory) and a single subcategory
  const backToList = () => setCurrentPage('questions-list')

  const activeNav = currentPage === 'home' ? 'home' : currentPage === 'questions-list' && !selectedSubcategory ? 'all' : null

  return (
    <div className="app-container">
      <Sidebar
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        onSelectSubcategory={handleSelectSubcategory}
        onSubcategoryDeleted={name => {
          if (name === selectedSubcategory) handleBackToHome()
        }}
        activeNav={activeNav}
        onGoHome={handleBackToHome}
        onShowAll={handleShowAll}
      />

      {currentPage === 'home' && (
        <HomePage onSelectSubcategory={handleSelectSubcategory} onShowAll={handleShowAll} />
      )}

      {currentPage === 'add-question' && (
        <AddQuestionPage onBack={backToList} initialSubcategory={selectedSubcategory} />
      )}

      {currentPage === 'questions-list' && (
        <QuestionsListPage
          selectedSubcategory={selectedSubcategory}
          onBack={handleBackToHome}
          onSelectQuestion={handleSelectQuestion}
          onViewQuestion={handleViewQuestion}
          onAddQuestion={() => setCurrentPage('add-question')}
        />
      )}

      {currentPage === 'view-question' && selectedQuestionId && (
        <QuestionViewPage
          questionId={selectedQuestionId}
          onBack={backToList}
          onEdit={handleSelectQuestion}
        />
      )}

      {currentPage === 'edit-question' && selectedQuestionId && (
        <QuestionEditPage
          questionId={selectedQuestionId}
          onBack={backToList}
        />
      )}
    </div>
  )
}

export default App
