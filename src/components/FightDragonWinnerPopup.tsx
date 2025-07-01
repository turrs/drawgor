import React, { useEffect, useState } from 'react'
import { Trophy, X, Swords, Shield, Crown } from 'lucide-react'

interface FightDragonWinnerPopupProps {
  isOpen: boolean
  onClose: () => void
  winnerData: {
    winningNumber: number
    isWinner: boolean
    prizeAmount: number
    totalWinners: number
  } | null
}

const FightDragonWinnerPopup: React.FC<FightDragonWinnerPopupProps> = ({ isOpen, onClose, winnerData }) => {
  const [showContent, setShowContent] = useState(false)

  useEffect(() => {
    if (isOpen) {
      // Delay showing content for dramatic effect
      const timer = setTimeout(() => setShowContent(true), 500)
      return () => clearTimeout(timer)
    } else {
      setShowContent(false)
    }
  }, [isOpen])

  if (!isOpen || !winnerData) return null

  const isKnightVictory = winnerData.winningNumber === 10
  const isDragonVictory = winnerData.winningNumber === 1

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Popup */}
      <div className={`relative max-w-md w-full transition-all duration-1000 ${
        showContent ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
      }`}>
        <div className="dragon-card rounded-2xl p-8 text-center dragon-shadow relative overflow-hidden">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-amber-400 hover:text-amber-300 transition-colors z-10"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Animated background effects */}
          <div className="absolute inset-0 dragon-fire-bg opacity-20 rounded-2xl" />
          <div className="absolute top-0 left-0 w-full h-full">
            <div className="absolute top-4 left-4 text-2xl animate-bounce">⚔️</div>
            <div className="absolute top-4 right-12 text-xl animate-pulse">🔥</div>
            <div className="absolute bottom-4 left-4 text-xl animate-bounce delay-300">💎</div>
            <div className="absolute bottom-4 right-4 text-2xl animate-pulse delay-500">
              {isDragonVictory ? '🐉' : '🛡️'}
            </div>
          </div>

          {/* Content */}
          <div className="relative z-10 space-y-6">
            {/* Header */}
            <div className="space-y-2">
              <h2 className="text-3xl font-bold dragon-meme-text dragon-epic">
                ⚔️ BATTLE CONCLUDED! ⚔️
              </h2>
              <p className="text-amber-400 font-semibold">
                The epic battle has ended...
              </p>
            </div>

            {/* Winning Side Display */}
            <div className="space-y-4">
              <div className="text-amber-300 font-bold dragon-meme-text">
                🏆 VICTORIOUS SIDE 🏆
              </div>
              <div className="dragon-winner rounded-2xl p-6 dragon-glow">
                <div className="text-6xl font-bold text-black dragon-meme-text mb-2">
                  {isDragonVictory ? '🐉' : '🛡️'}
                </div>
                <div className="text-2xl font-bold text-black dragon-meme-text">
                  {isDragonVictory ? 'DRAGON ARMY' : 'KNIGHT ORDER'}
                </div>
                <div className="text-black font-semibold">
                  Side {winnerData.winningNumber}
                </div>
              </div>
            </div>

            {/* Result */}
            {winnerData.isWinner ? (
              <div className="space-y-4">
                <div className="dragon-winner rounded-xl p-6 dragon-glow">
                  <Crown className="h-12 w-12 text-black mx-auto mb-3 dragon-wing" />
                  <h3 className="text-2xl font-bold text-black dragon-meme-text mb-2">
                    🎉 BATTLE VICTOR! 🎉
                  </h3>
                  <p className="text-black font-bold text-xl">
                    You've won {winnerData.prizeAmount.toFixed(4)} GOR! 💎
                  </p>
                  {winnerData.totalWinners > 1 && (
                    <p className="text-black font-semibold text-sm mt-2">
                      Shared with {winnerData.totalWinners - 1} other warrior{winnerData.totalWinners > 2 ? 's' : ''}
                    </p>
                  )}
                </div>
                <p className="text-amber-400 font-semibold text-sm">
                  🏆 Claim your battle reward in the History tab! 🏆
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-gray-800/50 border border-amber-500/50 rounded-xl p-6">
                  <Swords className="h-12 w-12 text-orange-500 mx-auto mb-3 dragon-breath" />
                  <h3 className="text-xl font-bold text-amber-300 dragon-meme-text mb-2">
                    ⚔️ VALIANT EFFORT, WARRIOR
                  </h3>
                  <p className="text-amber-400 font-semibold">
                    The {isDragonVictory ? 'Dragon Army' : 'Knight Order'} emerged victorious.
                  </p>
                  <p className="text-amber-500 text-sm mt-2">
                    But fear not! Another epic battle awaits! ⚔️
                  </p>
                </div>
              </div>
            )}

            {/* Action Button */}
            <button
              onClick={onClose}
              className="dragon-button px-8 py-3 rounded-lg font-bold text-lg transition-all dragon-scale-hover w-full"
            >
              {winnerData.isWinner ? '🏆 CLAIM YOUR VICTORY!' : '⚔️ BATTLE AGAIN!'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FightDragonWinnerPopup