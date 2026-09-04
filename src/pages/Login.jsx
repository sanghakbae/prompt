import { useAuth } from '../auth/AuthContext'

export default function Login() {
  const { signIn, error } = useAuth()
  return (
    <div className="login">
      <span className="logo" style={{ width: 40, height: 40, borderRadius: 12 }} />
      <h1>Prompt Manager</h1>
      <p className="muted">프롬프트를 보관하고, 버전으로 다듬고, 바로 실행합니다.</p>
      {error && <div className="error">{error}</div>}
      <button className="primary" onClick={signIn}>
        Google 계정으로 로그인
      </button>
    </div>
  )
}
