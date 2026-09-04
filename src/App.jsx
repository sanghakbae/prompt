import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import Login from './pages/Login'
import PromptList from './pages/PromptList'
import PromptEditor from './pages/PromptEditor'
import PromptDetail from './pages/PromptDetail'
import Run from './pages/Run'
import RunHistory from './pages/RunHistory'

export default function App() {
  const { user, loading, signOut, configured } = useAuth()

  if (!configured) {
    return (
      <div className="center-note">
        <h1>설정 필요</h1>
        <p>
          <code>.env</code> 에 Firebase 설정을 채워주세요 (<code>.env.example</code> 참고).
        </p>
      </div>
    )
  }
  if (loading) return <div className="center-note">불러오는 중…</div>
  if (!user) return <Login />

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo" />
          Prompt Manager
        </div>
        <nav>
          <NavLink to="/" end>
            프롬프트
          </NavLink>
          <NavLink to="/new">새 프롬프트</NavLink>
          <NavLink to="/history">실행 기록</NavLink>
        </nav>
        <div className="me">
          <span>{user.email}</span>
          <button className="ghost" onClick={signOut}>
            로그아웃
          </button>
        </div>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<PromptList />} />
          <Route path="/new" element={<PromptEditor />} />
          <Route path="/p/:id" element={<PromptDetail />} />
          <Route path="/p/:id/edit" element={<PromptEditor />} />
          <Route path="/p/:id/run" element={<Run />} />
          <Route path="/history" element={<RunHistory />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}
