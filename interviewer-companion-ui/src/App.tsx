import { useState } from 'react'
import './App.css'
import Sidebar from './components/Sidebar'
import AddQuestionPage from './pages/AddQuestionPage'
import QuestionsListPage from './pages/QuestionsListPage'
import QuestionEditPage from './pages/QuestionEditPage'
import QuestionViewPage from './pages/QuestionViewPage'

type PageType = 'home' | 'add-question' | 'questions-list' | 'edit-question' | 'view-question'

function App()
{
  const [selectedDifficulty, setSelectedDifficulty] = useState<string[]>(['All'])
  const [selectedType, setSelectedType] = useState<string[]>(['All'])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState<PageType>('home')
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null)
  const [selectedQuestionId, setSelectedQuestionId] = useState<number | null>(null)

  const handleBackToHome = () => {
    setCurrentPage('home')
    setSelectedSubcategory(null)
    setSelectedQuestionId(null)
  }

  const handleSelectSubcategory = (subcategory: string) => {
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

  return (
    <div className="app-container">
      <Sidebar
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        onAddQuestion={() => setCurrentPage('add-question')}
        onSelectSubcategory={handleSelectSubcategory}
        onSubcategoryDeleted={name => {
          if (name === selectedSubcategory) handleBackToHome()
        }}
      />

      {currentPage === 'home' && (
        <div className="main-content">
          {/* Questions list will go here */}
        </div>
      )}

      {currentPage === 'add-question' && (
        <AddQuestionPage onBack={handleBackToHome} />
      )}

      {currentPage === 'questions-list' && selectedSubcategory && (
        <QuestionsListPage
          selectedSubcategory={selectedSubcategory}
          onBack={handleBackToHome}
          onSelectQuestion={handleSelectQuestion}
          onViewQuestion={handleViewQuestion}
        />
      )}

      {currentPage === 'view-question' && selectedQuestionId && (
        <QuestionViewPage
          questionId={selectedQuestionId}
          onBack={() => setCurrentPage('questions-list')}
          onEdit={handleSelectQuestion}
        />
      )}

      {currentPage === 'edit-question' && selectedQuestionId && (
        <QuestionEditPage
          questionId={selectedQuestionId}
          onBack={() => setCurrentPage('questions-list')}
        />
      )}
    </div>
  )
}

export default App