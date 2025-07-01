import React, { useEffect, useState } from 'react'
import { Trophy, Gift, TrendingUp, Loader2, Crown, Flame, Swords } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useWallet } from '../contexts/WalletContext'

interface PlayerStats {
  // DrawGor stats
  totalWinnings: number
  totalClaimed: number
  totalUnclaimed: number
  gamesWon: number
  gamesPlayed: number
  winRate: number
  
  // Fight Dragon stats
  fightDragonWinnings: number
  fightDragonClaimed: number
  fightDragonUnclaimed: number
  fightDragonWins: number
  fightDragonBattles: number
  fightDragonWinRate: number
  
  // Combined stats for level calculation
  totalCombinedWins: number
  level: number
}

const PlayerRewardsSummary: React.FC = () => {
  const { connected, publicKey } = useWallet()
  const [stats, setStats] = useState<PlayerStats | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (connected && publicKey) {
      fetchPlayerStats()
    } else {
      setStats(null)
    }
  }, [connected, publicKey])

  const calculateLevel = (totalWins: number) => {
    if (totalWins >= 200) return 10
    if (totalWins >= 100) return 9
    if (totalWins >= 50) return 8
    if (totalWins >= 40) return 7
    if (totalWins >= 30) return 6
    if (totalWins >= 20) return 5
    if (totalWins >= 10) return 4
    if (totalWins >= 5) return 3
    if (totalWins >= 1) return 2
    return 1
  }

  const fetchPlayerStats = async () => {
    if (!publicKey) return

    setLoading(true)
    try {
      const walletAddress = publicKey.toString()

      // Fetch DrawGor player records
      const { data: drawGorRecords, error: drawGorError } = await supabase
        .from('players')
        .select('*')
        .eq('wallet_address', walletAddress)

      if (drawGorError) throw drawGorError

      // Fetch Fight Dragon player records
      const { data: fightDragonRecords, error: fightDragonError } = await supabase
        .from('fight_dragon_players')
        .select('*')
        .eq('wallet_address', walletAddress)

      if (fightDragonError) throw fightDragonError

      // Calculate DrawGor stats
      const drawGorPlayed = drawGorRecords?.length || 0
      const drawGorWinners = drawGorRecords?.filter(p => p.is_winner) || []
      const drawGorWon = drawGorWinners.length
      const drawGorWinRate = drawGorPlayed > 0 ? (drawGorWon / drawGorPlayed) * 100 : 0

      const drawGorTotalWinnings = drawGorWinners.reduce((sum, p) => sum + (p.prize_amount || 0), 0)
      const drawGorTotalClaimed = drawGorWinners
        .filter(p => p.reward_claimed)
        .reduce((sum, p) => sum + (p.prize_amount || 0), 0)
      const drawGorTotalUnclaimed = drawGorWinners
        .filter(p => !p.reward_claimed)
        .reduce((sum, p) => sum + (p.prize_amount || 0), 0)

      // Calculate Fight Dragon stats
      const fightDragonPlayed = fightDragonRecords?.length || 0
      const fightDragonWinners = fightDragonRecords?.filter(p => p.is_winner) || []
      const fightDragonWon = fightDragonWinners.length
      const fightDragonWinRate = fightDragonPlayed > 0 ? (fightDragonWon / fightDragonPlayed) * 100 : 0

      const fightDragonTotalWinnings = fightDragonWinners.reduce((sum, p) => sum + (p.prize_amount || 0), 0)
      const fightDragonTotalClaimed = fightDragonWinners
        .filter(p => p.reward_claimed)
        .reduce((sum, p) => sum + (p.prize_amount || 0), 0)
      const fightDragonTotalUnclaimed = fightDragonWinners
        .filter(p => !p.reward_claimed)
        .reduce((sum, p) => sum + (p.prize_amount || 0), 0)

      // Calculate combined stats for level
      const totalCombinedWins = drawGorWon + fightDragonWon
      const level = calculateLevel(totalCombinedWins)

      setStats({
        totalWinnings: drawGorTotalWinnings,
        totalClaimed: drawGorTotalClaimed,
        totalUnclaimed: drawGorTotalUnclaimed,
        gamesWon: drawGorWon,
        gamesPlayed: drawGorPlayed,
        winRate: drawGorWinRate,
        
        fightDragonWinnings: fightDragonTotalWinnings,
        fightDragonClaimed: fightDragonTotalClaimed,
        fightDragonUnclaimed: fightDragonTotalUnclaimed,
        fightDragonWins: fightDragonWon,
        fightDragonBattles: fightDragonPlayed,
        fightDragonWinRate: fightDragonWinRate,
        
        totalCombinedWins,
        level
      })

    } catch (error) {
      console.error('Error fetching player stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const getLevelIcon = (level: number) => {
    if (level >= 10) return <Crown className="h-6 w-6 text-purple-400 dragon-wing" />
    if (level >= 8) return <Trophy className="h-6 w-6 text-yellow-400 dragon-breath" />
    if (level >= 6) return <Swords className="h-6 w-6 text-orange-400 dragon-scale-hover" />
    if (level >= 4) return <Flame className="h-6 w-6 text-blue-400 dragon-breath" />
    if (level >= 2) return <TrendingUp className="h-6 w-6 text-green-400 dragon-wing" />
    return <Gift className="h-6 w-6 text-gray-400 dragon-breath" />
  }

  const getLevelTitle = (level: number) => {
    if (level >= 10) return '🐉 DRAGON EMPEROR'
    if (level >= 8) return '👑 DRAGON KING'
    if (level >= 6) return '⚔️ DRAGON WARRIOR'
    if (level >= 4) return '🔥 DRAGON KNIGHT'
    if (level >= 2) return '🗡️ DRAGON FIGHTER'
    return '🥚 DRAGON EGG'
  }

  if (!connected) {
    return (
      <div className="dragon-card rounded-xl p-6 text-center dragon-shadow">
        <Trophy className="h-12 w-12 text-amber-400 mx-auto mb-4 dragon-breath" />
        <h3 className="text-xl font-bold text-amber-300 mb-2 dragon-meme-text">🏆 YOUR DRAGON REWARDS</h3>
        <p className="text-amber-400 font-semibold">Connect your dragon wallet to view your epic rewards and statistics</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="dragon-card rounded-xl p-6 dragon-shadow">
        <div className="flex items-center justify-center py-8">
          <Flame className="h-8 w-8 text-orange-500 mr-3 dragon-breath" />
          <span className="text-amber-300 font-bold dragon-meme-text text-lg">🐉 AWAKENING DRAGON REWARDS...</span>
        </div>
      </div>
    )
  }

  if (!stats) {
    return null
  }

  const totalWinnings = stats.totalWinnings + stats.fightDragonWinnings
  const totalClaimed = stats.totalClaimed + stats.fightDragonClaimed
  const totalUnclaimed = stats.totalUnclaimed + stats.fightDragonUnclaimed
  const totalGamesPlayed = stats.gamesPlayed + stats.fightDragonBattles
  const overallWinRate = totalGamesPlayed > 0 ? (stats.totalCombinedWins / totalGamesPlayed) * 100 : 0

  return (
    <div className="dragon-card rounded-xl p-6 dragon-shadow">
      {/* Level Display */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          {getLevelIcon(stats.level)}
          <div>
            <h3 className="text-xl font-bold text-amber-300 dragon-meme-text">
              LEVEL {stats.level} - {getLevelTitle(stats.level)}
            </h3>
            <p className="text-amber-400 text-sm font-semibold">
              🏆 {stats.totalCombinedWins} Total Victories Across All Games
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-amber-300 dragon-meme-text">
            {totalWinnings.toFixed(4)} GOR
          </div>
          <div className="text-sm text-amber-400 font-bold">💎 TOTAL TREASURES</div>
        </div>
      </div>

      {/* Game Mode Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* DrawGor Stats */}
        <div className="dragon-card rounded-lg p-4 border border-blue-500/30">
          <div className="flex items-center space-x-2 mb-3">
            <Flame className="h-5 w-5 text-blue-400 dragon-breath" />
            <h4 className="text-lg font-bold text-amber-300 dragon-meme-text">🐉 DRAWGOR</h4>
          </div>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div>
              <div className="text-xl font-bold text-amber-300 dragon-meme-text">{stats.gamesWon}</div>
              <div className="text-xs text-blue-300 font-bold">🏆 WINS</div>
            </div>
            <div>
              <div className="text-xl font-bold text-amber-300 dragon-meme-text">{stats.gamesPlayed}</div>
              <div className="text-xs text-blue-300 font-bold">🎯 GAMES</div>
            </div>
            <div>
              <div className="text-xl font-bold text-amber-300 dragon-meme-text">{stats.winRate.toFixed(1)}%</div>
              <div className="text-xs text-blue-300 font-bold">📊 RATE</div>
            </div>
            <div>
              <div className="text-xl font-bold text-amber-300 dragon-meme-text">{stats.totalWinnings.toFixed(2)}</div>
              <div className="text-xs text-blue-300 font-bold">💎 GOR</div>
            </div>
          </div>
        </div>

        {/* Fight Dragon Stats */}
        <div className="dragon-card rounded-lg p-4 border border-red-500/30">
          <div className="flex items-center space-x-2 mb-3">
            <Swords className="h-5 w-5 text-red-400 dragon-breath" />
            <h4 className="text-lg font-bold text-amber-300 dragon-meme-text">⚔️ FIGHT DRAGON</h4>
          </div>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div>
              <div className="text-xl font-bold text-amber-300 dragon-meme-text">{stats.fightDragonWins}</div>
              <div className="text-xs text-red-300 font-bold">⚔️ WINS</div>
            </div>
            <div>
              <div className="text-xl font-bold text-amber-300 dragon-meme-text">{stats.fightDragonBattles}</div>
              <div className="text-xs text-red-300 font-bold">🛡️ BATTLES</div>
            </div>
            <div>
              <div className="text-xl font-bold text-amber-300 dragon-meme-text">{stats.fightDragonWinRate.toFixed(1)}%</div>
              <div className="text-xs text-red-300 font-bold">📊 RATE</div>
            </div>
            <div>
              <div className="text-xl font-bold text-amber-300 dragon-meme-text">{stats.fightDragonWinnings.toFixed(2)}</div>
              <div className="text-xs text-red-300 font-bold">💎 GOR</div>
            </div>
          </div>
        </div>
      </div>

      {/* Overall Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="dragon-card rounded-lg p-4 text-center dragon-scale-hover border border-yellow-500/30">
          <Trophy className="h-8 w-8 text-yellow-400 mx-auto mb-2 dragon-wing" />
          <div className="text-2xl font-bold text-amber-300 dragon-meme-text">
            {totalClaimed.toFixed(4)}
          </div>
          <div className="text-sm text-yellow-300 font-bold">💰 GOLD CLAIMED</div>
        </div>

        <div className="dragon-card rounded-lg p-4 text-center dragon-scale-hover border border-orange-500/30">
          <Gift className="h-8 w-8 text-orange-400 mx-auto mb-2 dragon-breath" />
          <div className="text-2xl font-bold text-amber-300 dragon-meme-text">
            {totalUnclaimed.toFixed(4)}
          </div>
          <div className="text-sm text-orange-300 font-bold">⏳ GOLD PENDING</div>
        </div>

        <div className="dragon-card rounded-lg p-4 text-center dragon-scale-hover border border-purple-500/30">
          <TrendingUp className="h-8 w-8 text-purple-400 mx-auto mb-2 dragon-wing" />
          <div className="text-2xl font-bold text-amber-300 dragon-meme-text">
            {overallWinRate.toFixed(1)}%
          </div>
          <div className="text-sm text-purple-300 font-bold">🐉 OVERALL POWER</div>
        </div>
      </div>

      {/* Quick Action */}
      {totalUnclaimed > 0 && (
        <div className="mt-4 p-3 dragon-fire-bg rounded-lg dragon-glow">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-bold text-black dragon-meme-text">🏆 UNCLAIMED DRAGON TREASURES!</div>
              <div className="text-xs text-black/80 font-semibold">
                {totalUnclaimed.toFixed(4)} GOR awaiting your claim across all games
              </div>
            </div>
            <a
              href="/history"
              className="bg-black hover:bg-gray-800 text-amber-300 px-3 py-1 rounded text-sm font-bold transition-colors dragon-scale-hover"
            >
              🎁 CLAIM NOW
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

export default PlayerRewardsSummary