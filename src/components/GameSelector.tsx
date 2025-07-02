import React from 'react'
import { Flame, Swords } from 'lucide-react'

interface GameSelectorProps {
  selectedGame: 'drawgor' | 'fightdragon'
  onGameChange: (game: 'drawgor' | 'fightdragon') => void
}

const GameSelector: React.FC<GameSelectorProps> = ({ selectedGame, onGameChange }) => {
  return (
    <div className="dragon-card rounded-xl p-4 dragon-shadow">
      <h3 className="text-lg font-bold text-amber-300 mb-4 text-center dragon-meme-text">
        🎮 CHOOSE YOUR GAME MODE 🎮
      </h3>
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => onGameChange('drawgor')}
          className={`p-4 rounded-lg font-bold transition-all dragon-scale-hover border-2 ${
            selectedGame === 'drawgor'
              ? 'dragon-fire-bg border-blue-400 dragon-glow text-white'
              : 'dragon-card border-blue-500/50 text-blue-300 hover:border-blue-400 hover:bg-blue-900/30'
          }`}
        >
          <div className="flex flex-col items-center space-y-2">
            <Flame className={`h-8 w-8 ${selectedGame === 'drawgor' ? 'text-black' : 'text-blue-400'} dragon-breath`} />
            <div className={`text-lg dragon-meme-text ${selectedGame === 'drawgor' ? 'text-white' : 'text-blue-300'}`}>
              🐉 DRAWGOR
            </div>
            <div className={`text-xs text-center ${selectedGame === 'drawgor' ? 'text-black/80' : 'text-blue-400'}`}>
              Pick numbers 1-10
            </div>
          </div>
        </button>

        <button
          onClick={() => onGameChange('fightdragon')}
          className={`p-4 rounded-lg font-bold transition-all dragon-scale-hover border-2 ${
            selectedGame === 'fightdragon'
              ? 'dragon-fire-bg border-red-400 dragon-glow text-black'
              : 'dragon-card border-red-500/50 text-red-300 hover:border-red-400 hover:bg-red-900/30'
          }`}
        >
          <div className="flex flex-col items-center space-y-2">
            <Swords className={`h-8 w-8 ${selectedGame === 'fightdragon' ? 'text-black' : 'text-red-400'} dragon-breath`} />
            <div className={`text-lg dragon-meme-text ${selectedGame === 'fightdragon' ? 'text-white' : 'text-red-300'}`}>
              ⚔️ FIGHT DRAGON
            </div>
            <div className={`text-xs text-center ${selectedGame === 'fightdragon' ? 'text-black/80' : 'text-red-400'}`}>
              Dragon vs Knight
            </div>
          </div>
        </button>
      </div>
    </div>
  )
}

export default GameSelector