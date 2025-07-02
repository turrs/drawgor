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
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2 md:space-x-3 dragon-scale-hover">
              <div className="relative">
                <img 
                  src="/dragon-logo.png" 
                  alt="DrawGor Dragon Logo"
                  className="h-12 w-12 md:h-16 md:w-16 object-contain dragon-breath"
                  onError={(e) => {
                    // Fallback to flame icon if image fails to load
                    e.currentTarget.style.display = 'none'
                    e.currentTarget.nextElementSibling.style.display = 'block'
                  }}
                />
                <div className="hidden">
                  <Flame className="h-8 w-8 md:h-10 md:w-10 text-orange-500 dragon-breath" />
                  <div className="absolute inset-0 h-8 w-8 md:h-10 md:w-10 text-yellow-400 dragon-wing">
                    <Flame className="h-8 w-8 md:h-10 md:w-10" />
                  </div>
                </div>
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-amber-400 dragon-meme-text">
                  DrawGor
                </h1>
                <p className="text-xs text-amber-400 font-semibold tracking-wider hidden md:block">
                  🐉 DRAGON POWER DRAWS 🐉
                </p>
              </div>
            </Link>
            
            {/* Navigation and Wallet */}
            <div className="flex items-center space-x-2 md:space-x-6">
              {/* Desktop Navigation */}
              <nav className="hidden lg:flex items-center space-x-4 xl:space-x-6">
                <Link
                  to="/"
                  className={`flex items-center space-x-2 px-3 py-2 xl:px-4 xl:py-2 rounded-lg transition-all dragon-scale-hover text-sm xl:text-base ${
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
                  className={`flex items-center space-x-2 px-3 py-2 xl:px-4 xl:py-2 rounded-lg transition-all dragon-scale-hover text-sm xl:text-base ${
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
                  className={`flex items-center space-x-2 px-3 py-2 xl:px-4 xl:py-2 rounded-lg transition-all dragon-scale-hover text-sm xl:text-base ${
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
                  className={`flex items-center space-x-2 px-3 py-2 xl:px-4 xl:py-2 rounded-lg transition-all dragon-scale-hover text-sm xl:text-base ${
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
                  className="flex items-center space-x-2 px-3 py-2 xl:px-4 xl:py-2 rounded-lg transition-all dragon-scale-hover text-green-400 hover:text-green-300 hover:bg-green-900/30 border border-green-500/30 dragon-glow text-sm xl:text-base"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span className="font-bold">💧 FAUCET</span>
                </a>
              </nav>
              
              {/* Wallet Button */}
              <div className="flex-shrink-0">
                <WalletButton />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 md:py-8 pb-20 md:pb-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-amber-500/30 bg-gradient-to-r from-orange-900/20 via-red-900/20 to-orange-900/20 backdrop-blur-sm mt-20">
        <div className="container mx-auto px-4 py-6 md:py-8">
          <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
            <div className="flex items-center space-x-3">
              <img 
                src="/dragon-logo.png" 
                alt="DrawGor Dragon Logo"
                className="h-6 w-6 md:h-8 md:w-8 object-contain dragon-breath"
                onError={(e) => {
                  // Fallback to flame icon if image fails to load
                  e.currentTarget.style.display = 'none'
                  e.currentTarget.nextElementSibling.style.display = 'inline-block'
                }}
              />
              <Flame className="h-5 w-5 md:h-6 md:w-6 text-orange-400 dragon-breath hidden" />
              <span className="text-amber-400 font-bold dragon-meme-text text-sm md:text-base">
                DrawGor - 🐉 EPIC DRAGON DRAWS 🐉
              </span>
            </div>
            <div className="text-xs md:text-sm text-amber-500 font-semibold text-center">
              Powered by GOR Chain & Dragon Magic 🔥
            </div>
          </div>
        </div>
      </footer>

      {/* Mobile Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-gradient-to-r from-orange-900 via-red-900 to-orange-900 border-t border-amber-500/50 px-2 py-2 dragon-shadow z-50">
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