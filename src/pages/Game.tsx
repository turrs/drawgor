import React, { useState } from 'react'
import GameBoard from '../components/GameBoard'
import FightDragonGame from '../components/FightDragonGame'
import GameSelector from '../components/GameSelector'

const Game: React.FC = () => {
  const [selectedGame, setSelectedGame] = useState<'drawgor' | 'fightdragon'>('drawgor')

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-6">
        <div className="relative">
          <h1 className="text-6xl md:text-8xl font-bold text-amber-400 dragon-meme-text mb-4">
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
            Choose your game mode and unleash dragon power! 🔥💎
          </p>
        </div>
      </div>

      {/* Game Selector */}
      <div className="max-w-md mx-auto">
        <GameSelector 
          selectedGame={selectedGame} 
          onGameChange={setSelectedGame} 
        />
      </div>

      {/* Game Content */}
      {selectedGame === 'drawgor' ? <GameBoard /> : <FightDragonGame />}
    </div>
  )
}

export default Game