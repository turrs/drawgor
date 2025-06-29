import React from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { Flame, Settings, Users, TrendingUp, User, ExternalLink } from 'lucide-react'
import WalletButton from './WalletButton'

const Layout: React.FC = () => {
  const location = useLocation()
  const isAdminRoute = location.pathname.startsWith('/admin')

  if (isAdminRoute) {
    return <Outlet />
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-amber-500/30 bg-gradient-to-r from-orange-900/20 via-red-900/20 to-orange-900/20 backdrop-blur-sm sticky top-0 z-50 dragon-shadow">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center space-x-3 dragon-scale-hover">
              <div className="relative">
                <Flame className="h-10 w-10 text-orange-500 dragon-breath" />
                <div className="absolute inset-0 h-10 w-10 text-yellow-400 dragon-wing">
                  <Flame className="h-10 w-10" />
                </div>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-amber-400 dragon-meme-text">
                  DrawGor
                </h1>
                <p className="text-xs text-amber-400 font-semibold tracking-wider">
                  🐉 DRAGON POWER DRAWS 🐉
                </p>
              </div>
            </Link>
            
            <div className="flex items-center space-x-6">
              <nav className="hidden md:flex items-center space-x-6">
                <Link
                  to="/"
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all dragon-scale-hover ${
                    location.pathname === '/' 
                      ? 'dragon-button dragon-glow' 
                      : 'text-amber-300 hover:text-amber-100 hover:bg-orange-900/30 border border-amber-500/30'
                  }`}
                >
                  <Flame className="h-4 w-4" />
                  <span className="font-bold">DRAW</span>
                </Link>
                <Link
                  to="/profile"
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all dragon-scale-hover ${
                    location.pathname === '/profile' 
                      ? 'dragon-button dragon-glow' 
                      : 'text-amber-300 hover:text-amber-100 hover:bg-orange-900/30 border border-amber-500/30'
                  }`}
                >
                  <User className="h-4 w-4" />
                  <span className="font-bold">PROFILE</span>
                </Link>
                <Link
                  to="/leaderboard"
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all dragon-scale-hover ${
                    location.pathname === '/leaderboard' 
                      ? 'dragon-button dragon-glow' 
                      : 'text-amber-300 hover:text-amber-100 hover:bg-orange-900/30 border border-amber-500/30'
                  }`}
                >
                  <TrendingUp className="h-4 w-4" />
                  <span className="font-bold">LEADERBOARD</span>
                </Link>
                <Link
                  to="/history"
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all dragon-scale-hover ${
                    location.pathname === '/history' 
                      ? 'dragon-button dragon-glow' 
                      : 'text-amber-300 hover:text-amber-100 hover:bg-orange-900/30 border border-amber-500/30'
                  }`}
                >
                  <Users className="h-4 w-4" />
                  <span className="font-bold">HISTORY</span>
                </Link>
                
                {/* GOR Faucet Link */}
                <a
                  href="https://faucet.gorbagana.wtf/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg transition-all dragon-scale-hover text-green-400 hover:text-green-300 hover:bg-green-900/30 border border-green-500/30 dragon-glow"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span className="font-bold">💧 FAUCET</span>
                </a>
              </nav>
              
              {/* Wallet Button in top right */}
              <WalletButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-amber-500/30 bg-gradient-to-r from-orange-900/20 via-red-900/20 to-orange-900/20 backdrop-blur-sm mt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <Flame className="h-6 w-6 text-orange-400 dragon-breath" />
              <span className="text-amber-400 font-bold dragon-meme-text">
                DrawGor - 🐉 EPIC DRAGON DRAWS 🐉
              </span>
            </div>
            <div className="text-sm text-amber-500 font-semibold">
              Powered by GOR Chain & Dragon Magic 🔥
            </div>
          </div>
        </div>
      </footer>

      {/* Mobile Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-gradient-to-r from-orange-900 via-red-900 to-orange-900 border-t border-amber-500/50 px-4 py-2 dragon-shadow">
        <div className="flex justify-around">
          <Link
            to="/"
            className={`flex flex-col items-center space-y-1 p-2 rounded-lg transition-all dragon-scale-hover ${
              location.pathname === '/' 
                ? 'text-amber-300 dragon-glow' 
                : 'text-amber-500'
            }`}
          >
            <Flame className="h-5 w-5" />
            <span className="text-xs font-bold">DRAW</span>
          </Link>
          <Link
            to="/profile"
            className={`flex flex-col items-center space-y-1 p-2 rounded-lg transition-all dragon-scale-hover ${
              location.pathname === '/profile' 
                ? 'text-amber-300 dragon-glow' 
                : 'text-amber-500'
            }`}
          >
            <User className="h-5 w-5" />
            <span className="text-xs font-bold">PROFILE</span>
          </Link>
          <Link
            to="/leaderboard"
            className={`flex flex-col items-center space-y-1 p-2 rounded-lg transition-all dragon-scale-hover ${
              location.pathname === '/leaderboard' 
                ? 'text-amber-300 dragon-glow' 
                : 'text-amber-500'
            }`}
          >
            <TrendingUp className="h-5 w-5" />
            <span className="text-xs font-bold">BOARD</span>
          </Link>
          <Link
            to="/history"
            className={`flex flex-col items-center space-y-1 p-2 rounded-lg transition-all dragon-scale-hover ${
              location.pathname === '/history' 
                ? 'text-amber-300 dragon-glow' 
                : 'text-amber-500'
            }`}
          >
            <Users className="h-5 w-5" />
            <span className="text-xs font-bold">HISTORY</span>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Layout