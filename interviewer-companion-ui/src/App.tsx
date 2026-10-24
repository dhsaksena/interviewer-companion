import { useEffect } from 'react'
import './App.css'
import Sidebar from './components/Sidebar'
import UnsavedChangesDialog from './components/UnsavedChangesDialog'
import AddQuestionPage from './pages/AddQuestionPage'
import QuestionsListPage from './pages/QuestionsListPage'
import QuestionEditPage from './pages/QuestionEditPage'
import QuestionViewPage from './pages/QuestionViewPage'
import InterviewsPage from './pages/InterviewsPage'
import InterviewViewPage from './pages/InterviewViewPage'
import InterviewEditPage from './pages/InterviewEditPage'
import HomePage from './pages/HomePage'
import LandingPage from './pages/LandingPage'
import { useAuth } from './auth/AuthContext'
import { navigate, paths, useRoute } from './router'

// "/" focuses the search box and "n" starts a new item on list pages, unless the user is typing
const useShortcuts = () => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const target = e.target as HTMLElement | null
      if (target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return
      if (document.querySelector('[role="dialog"]')) return

      if (e.key === '/') {
        const search = document.querySelector<HTMLInputElement>('input[type="search"]')
        if (search) { e.preventDefault(); search.focus() }
      } else if (e.key === 'n') {
        const add = document.querySelector<HTMLButtonElement>('.fab')
        if (add) { e.preventDefault(); add.click() }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
}

function MainApp()
{
  const route = useRoute()
  useShortcuts()

  const selectedSubcategory = route.name === 'questions' || route.name === 'question-new' ? route.sub : null

  const activeNav = route.name === 'home' ? 'home'
    : route.name === 'questions' && !route.sub ? 'all'
    : route.name.startsWith('interview') ? 'interviews'
    : null

  return (
    <div className="app-container">
      <Sidebar
        selectedCategory={selectedSubcategory}
        refreshToken={route.name}
        onSelectSubcategory={(name, options) => navigate(paths.questions(name), options)}
        onSubcategoryDeleted={name => {
          if (name === selectedSubcategory) navigate(paths.home())
        }}
        activeNav={activeNav}
        onGoHome={() => navigate(paths.home())}
        onShowAll={() => navigate(paths.questions())}
        onShowInterviews={() => navigate(paths.interviews())}
      />

      {route.name === 'home' && <HomePage />}
      {route.name === 'questions' && <QuestionsListPage selectedSubcategory={route.sub} />}
      {route.name === 'question-new' && <AddQuestionPage initialSubcategory={route.sub} />}
      {route.name === 'question-view' && <QuestionViewPage key={route.id} questionId={route.id} from={route.from} />}
      {route.name === 'question-edit' && <QuestionEditPage key={route.id} questionId={route.id} from={route.from} />}
      {route.name === 'interviews' && <InterviewsPage />}
      {route.name === 'interview-new' && <InterviewEditPage key="new" interviewId={null} />}
      {route.name === 'interview-view' && <InterviewViewPage key={route.id} interviewId={route.id} />}
      {route.name === 'interview-edit' && <InterviewEditPage key={route.id} interviewId={route.id} />}

      <UnsavedChangesDialog />
    </div>
  )
}

function App()
{
  const { user, loading } = useAuth()

  if (loading) return <div className="auth-loading" role="status">Loading…</div>
  // Remount MainApp per user so navigation state never leaks between sessions
  return user ? <MainApp key={user.id} /> : <LandingPage />
}

export default App
