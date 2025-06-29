import React from 'react'
import GameBoard from '../components/GameBoard'
import PlayerRewardsSummary from '../components/PlayerRewardsSummary'

const Game: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-6">
        <div className="relative">
          <h1 className="text-6xl md:text-8xl font-bold text-amber-400 dragon-meme-textc mb-4">
            DrawGor
          </h1>
          <div className="absolute -top-2 -right-2 text-4xl animate-bounce">🐉</div>
          <div className="absolute -bottom-2 -left-2 text-3xl animate-pulse">🔥</div>
        </div>
        <div className="dragon-card rounded-2xl p-6 max-w-2xl mx-auto dragon-shadow">
          <p className="text-xl md:text-2xl text-amber-300 font-bold dragon-meme-text mb-2">
            🐲 SUMMON THE DRAGON'S LUCK! 🐲
          </p>
          <p className="text-amber-400 font-semibold">
            Pick your number, unleash dragon power, claim epic rewards! 🔥💎
          </p>
        </div>
      </div>

      {/* Player Rewards Summary */}
      <PlayerRewardsSummary />

      {/* Game Board */}
      <GameBoard />
    </div>
  )
}

export default Game