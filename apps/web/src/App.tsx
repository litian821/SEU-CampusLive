import { NavLink, Route, Routes } from 'react-router-dom'
import HomePage from './pages/HomePage'
import LiveListPage from './pages/LiveListPage'
import LivePlayerPage from './pages/LivePlayerPage'
import VodListPage from './pages/VodListPage'
import VodPlayerPage from './pages/VodPlayerPage'

function App() {
  return (
    <div className="app-shell">
      <header className="site-header">
        <NavLink className="brand" to="/">校赛直播台</NavLink>
        <nav aria-label="主导航">
          <NavLink to="/live">直播</NavLink>
          <NavLink to="/vod">点播</NavLink>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/live" element={<LiveListPage />} />
          <Route path="/live/:streamId" element={<LivePlayerPage />} />
          <Route path="/vod" element={<VodListPage />} />
          <Route path="/vod/:videoId" element={<VodPlayerPage />} />
        </Routes>
      </main>
      <footer>校园体育赛事直播与点播平台 · MVP</footer>
    </div>
  )
}

export default App
