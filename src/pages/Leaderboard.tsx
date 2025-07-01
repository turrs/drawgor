import React, { useEffect, useState } from 'react'
import { Trophy, Medal, Award, TrendingUp, Crown, Flame, Star, Zap, Swords } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface LeaderboardEntry {
  wallet_address: string
  total_winnings: number
  games_played: number
  games_won: number
  win_rate: number
  level: number
  
  // Game-specific stats
  drawgor_wins: number
  drawgor_games: number
  drawgor_winnings: number
  fight_dragon_wins: number
  fight_dragon_battles: number
  fight_dragon_winnings: number
}

const Leaderboard: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [gameFilter, setGameFilter] = useState<'all' | 'drawgor' | 'fight_dragon'>('all')

  useEffect(() => {
    fetchLeaderboard()
  }, [])

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

  const fetchLeaderboard = async () => {
    try {
      // Fetch DrawGor data
      const { data: drawGorData, error: drawGorError } = await supabase
        .from('players')
        .select('wallet_address, prize_amount, is_winner')

      if (drawGorError) throw drawGorError

      // Fetch Fight Dragon data
      const { data: fightDragonData, error: fightDragonError } = await supabase
        .from('fight_dragon_players')
        .select('wallet_address, prize_amount, is_winner')

      if (fightDragonError) throw fightDragonError

      // Process data to create combined leaderboard
      const playerStats: { [key: string]: LeaderboardEntry } = {}

      // Process DrawGor data
      drawGorData?.forEach((player) => {
        const address = player.wallet_address
        if (!playerStats[address]) {
          playerStats[address] = {
            wallet_address: address,
            total_winnings: 0,
            games_played: 0,
            games_won: 0,
            win_rate: 0,
            level: 1,
            drawgor_wins: 0,
            drawgor_games: 0,
            drawgor_winnings: 0,
            fight_dragon_wins: 0,
            fight_dragon_battles: 0,
            fight_dragon_winnings: 0
          }
        }

        playerStats[address].drawgor_games += 1
        playerStats[address].games_played += 1
        playerStats[address].drawgor_winnings += player.prize_amount || 0
        playerStats[address].total_winnings += player.prize_amount || 0
        
        if (player.is_winner) {
          playerStats[address].drawgor_wins += 1
          playerStats[address].games_won += 1
        }
      })

      // Process Fight Dragon data
      fightDragonData?.forEach((player) => {
        const address = player.wallet_address
        if (!playerStats[address]) {
          playerStats[address] = {
            wallet_address: address,
            total_winnings: 0,
            games_played: 0,
            games_won: 0,
            win_rate: 0,
            level: 1,
            drawgor_wins: 0,
            drawgor_games: 0,
            drawgor_winnings: 0,
            fight_dragon_wins: 0,
            fight_dragon_battles: 0,
            fight_dragon_winnings: 0
          }
        }

        playerStats[address].fight_dragon_battles += 1
        playerStats[address].games_played += 1
        playerStats[address].fight_dragon_winnings += player.prize_amount || 0
        playerStats[address].total_winnings += player.prize_amount || 0
        
        if (player.is_winner) {
          playerStats[address].fight_dragon_wins += 1
          playerStats[address].games_won += 1
        }
      })

      // Calculate win rates, levels and sort
      const leaderboardData = Object.values(playerStats)
        .map(entry => ({
          ...entry,
          win_rate: entry.games_played > 0 ? (entry.games_won / entry.games_played) * 100 : 0,
          level: calculateLevel(entry.games_won)
        }))
        .sort((a, b) => {
          // Sort by level first (descending), then by total winnings (descending)
          if (a.level !== b.level) {
            return b.level - a.level
          }
          return b.total_winnings - a.total_winnings
        })
        .slice(0, 10) // Top 10

      setLeaderboard(leaderboardData)
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-6 w-6 md:h-8 md:w-8 text-yellow-400 dragon-wing" />
      case 2:
        return <Trophy className="h-6 w-6 md:h-8 md:w-8 text-gray-300 dragon-breath" />
      case 3:
        return <Medal className="h-6 w-6 md:h-8 md:w-8 text-orange-400 dragon-scale-hover" />
      default:
        return <span className="text-lg md:text-2xl font-bold text-amber-400 dragon-meme-text">#{rank}</span>
    }
  }

  const getLevelIcon = (level: number) => {
    if (level >= 10) return <Crown className="h-4 w-4 md:h-6 md:w-6 text-purple-400 dragon-wing" />
    if (level >= 8) return <Star className="h-4 w-4 md:h-6 md:w-6 text-yellow-400 dragon-breath" />
    if (level >= 6) return <Award className="h-4 w-4 md:h-6 md:w-6 text-orange-400 dragon-scale-hover" />
    if (level >= 4) return <Trophy className="h-4 w-4 md:h-6 md:w-6 text-blue-400 dragon-breath" />
    if (level >= 2) return <Flame className="h-4 w-4 md:h-6 md:w-6 text-green-400 dragon-wing" />
    return <Zap className="h-4 w-4 md:h-6 md:w-6 text-gray-400 dragon-breath" />
  }

  const getLevelTitle = (level: number) => {
    if (level >= 10) return '🐉 DRAGON EMPEROR'
    if (level >= 8) return '👑 DRAGON KING'
    if (level >= 6) return '🔥 DRAGON LORD'
    if (level >= 4) return '⚡ DRAGON KNIGHT'
    if (level >= 2) return '🗡️ DRAGON WARRIOR'
    return '🥚 DRAGON EGG'
  }

  const getRankBackground = (rank: number) => {
    switch (rank) {
      case 1:
        return 'dragon-fire-bg border-yellow-500 dragon-glow'
      case 2:
        return 'bg-gradient-to-r from-gray-600 to-gray-400 border-gray-300'
      case 3:
        return 'bg-gradient-to-r from-orange-600 to-orange-400 border-orange-300'
      default:
        return 'dragon-card border-amber-500/30'
    }
  }

  // Filter leaderboard based on game type
  const getFilteredStats = (entry: LeaderboardEntry) => {
    switch (gameFilter) {
      case 'drawgor':
        return {
          wins: entry.drawgor_wins,
          games: entry.drawgor_games,
          winnings: entry.drawgor_winnings,
          winRate: entry.drawgor_games > 0 ? (entry.drawgor_wins / entry.drawgor_games) * 100 : 0
        }
      case 'fight_dragon':
        return {
          wins: entry.fight_dragon_wins,
          games: entry.fight_dragon_battles,
          winnings: entry.fight_dragon_winnings,
          winRate: entry.fight_dragon_battles > 0 ? (entry.fight_dragon_wins / entry.fight_dragon_battles) * 100 : 0
        }
      default:
        return {
          wins: entry.games_won,
          games: entry.games_played,
          winnings: entry.total_winnings,
          winRate: entry.win_rate
        }
    }
  }

  const sortedLeaderboard = [...leaderboard].sort((a, b) => {
    const aStats = getFilteredStats(a)
    const bStats = getFilteredStats(b)
    
    if (gameFilter === 'all') {
      // For 'all', sort by level first, then by total winnings
      if (a.level !== b.level) {
        return b.level - a.level
      }
      return bStats.winnings - aStats.winnings
    } else {
      // For specific games, sort by winnings in that game
      return bStats.winnings - aStats.winnings
    }
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="dragon-card rounded-2xl p-8 text-center dragon-glow">
          <TrendingUp className="h-12 w-12 text-amber-400 mx-auto mb-4 dragon-breath" />
          <p className="text-amber-300 font-bold dragon-meme-text text-xl">🐉 AWAKENING DRAGON LEADERBOARD...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="dragon-card rounded-2xl p-4 md:p-6 dragon-shadow">
          <h1 className="text-3xl md:text-4xl lg:text-6xl font-bold text-amber-400 dragon-meme-text mb-2 md:mb-4">
            🐉 DRAGON LEADERBOARD 🐉
          </h1>
          <p className="text-lg md:text-xl text-amber-300 font-bold dragon-meme-text">
            🏆 TOP 10 DRAGON WARRIORS BY LEVEL & POWER 🏆
          </p>
        </div>
      </div>

      {/* Game Filter */}
      <div className="flex flex-wrap justify-center gap-2">
        <button
          onClick={() => setGameFilter('all')}
          className={`px-3 py-2 md:px-4 md:py-2 rounded-lg font-bold text-xs md:text-sm transition-all dragon-scale-hover ${
            gameFilter === 'all'
              ? 'dragon-fire-bg text-black'
              : 'dragon-card border border-amber-500/30 text-amber-300 hover:text-amber-100'
          }`}
        >
          🎮 ALL GAMES
        </button>
        <button
          onClick={() => setGameFilter('drawgor')}
          className={`px-3 py-2 md:px-4 md:py-2 rounded-lg font-bold text-xs md:text-sm transition-all dragon-scale-hover ${
            gameFilter === 'drawgor'
              ? 'dragon-fire-bg text-black'
              : 'dragon-card border border-amber-500/30 text-amber-300 hover:text-amber-100'
          }`}
        >
          🐉 DRAWGOR
        </button>
        <button
          onClick={() => setGameFilter('fight_dragon')}
          className={`px-3 py-2 md:px-4 md:py-2 rounded-lg font-bold text-xs md:text-sm transition-all dragon-scale-hover ${
            gameFilter === 'fight_dragon'
              ? 'dragon-fire-bg text-black'
              : 'dragon-card border border-amber-500/30 text-amber-300 hover:text-amber-100'
          }`}
        >
          ⚔️ FIGHT DRAGON
        </button>
      </div>

      {/* Leaderboard */}
      <div className="dragon-card rounded-xl overflow-hidden dragon-shadow">
        <div className="px-4 py-3 md:px-6 md:py-4 border-b border-amber-500/30 dragon-fire-bg">
          <h2 className="text-lg md:text-2xl font-bold text-black dragon-meme-text">
            👑 HALL OF DRAGON CHAMPIONS
            {gameFilter !== 'all' && (
              <span className="ml-2 text-sm md:text-base">
                {gameFilter === 'drawgor' ? '🐉' : '⚔️'} 
                {gameFilter === 'drawgor' ? 'DRAWGOR' : 'FIGHT DRAGON'}
              </span>
            )}
          </h2>
        </div>

        {sortedLeaderboard.length === 0 ? (
          <div className="text-center py-8 md:py-12">
            <Flame className="h-12 w-12 md:h-16 md:w-16 text-amber-400 mx-auto mb-4 dragon-breath" />
            <p className="text-amber-400 font-bold dragon-meme-text text-lg md:text-xl">🐉 NO DRAGON WARRIORS YET!</p>
            <p className="text-amber-500 font-semibold mt-2">Be the first to claim dragon power!</p>
          </div>
        ) : (
          <div className="divide-y divide-amber-500/30">
            {sortedLeaderboard.map((entry, index) => {
              const stats = getFilteredStats(entry)
              return (
                <div
                  key={entry.wallet_address}
                  className={`px-3 py-4 md:px-6 md:py-6 flex flex-col md:flex-row md:items-center md:justify-between hover:bg-orange-900/20 transition-all dragon-scale-hover space-y-3 md:space-y-0 ${
                    index < 3 ? getRankBackground(index + 1) : 'dragon-card'
                  }`}
                >
                  {/* Mobile Layout */}
                  <div className="flex items-center space-x-3 md:space-x-6">
                    {/* Rank */}
                    <div className="flex-shrink-0 w-10 md:w-16 flex justify-center">
                      {getRankIcon(index + 1)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col md:flex-row md:items-center md:space-x-4">
                        {/* Level Badge - Only show for 'all' filter */}
                        {gameFilter === 'all' && (
                          <div className="flex items-center space-x-2 bg-gray-800/50 rounded-lg px-2 py-1 md:px-3 md:py-2 border border-amber-500/30 mb-2 md:mb-0">
                            {getLevelIcon(entry.level)}
                            <div className="text-center">
                              <div className="text-sm md:text-lg font-bold text-amber-300 dragon-meme-text">
                                LVL {entry.level}
                              </div>
                              <div className="text-xs text-amber-500 font-semibold hidden md:block">
                                {getLevelTitle(entry.level)}
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Game Type Badge - Only show for specific game filters */}
                        {gameFilter !== 'all' && (
                          <div className="flex items-center space-x-2 bg-gray-800/50 rounded-lg px-2 py-1 md:px-3 md:py-2 border border-amber-500/30 mb-2 md:mb-0">
                            {gameFilter === 'drawgor' ? 
                              <Flame className="h-4 w-4 md:h-6 md:w-6 text-blue-400 dragon-breath" /> :
                              <Swords className="h-4 w-4 md:h-6 md:w-6 text-red-400 dragon-breath" />
                            }
                            <div className="text-center">
                              <div className="text-sm md:text-lg font-bold text-amber-300 dragon-meme-text">
                                {gameFilter === 'drawgor' ? '🐉' : '⚔️'}
                              </div>
                              <div className="text-xs text-amber-500 font-semibold hidden md:block">
                                {gameFilter === 'drawgor' ? 'DRAWGOR' : 'FIGHT DRAGON'}
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Wallet Info */}
                        <div className="flex-1 min-w-0">
                          <div className={`font-mono font-bold text-sm md:text-lg break-all ${
                            index < 3 ? 'text-black' : 'text-amber-300'
                          }`}>
                            <span className="md:hidden">
                              {entry.wallet_address.slice(0, 8)}...{entry.wallet_address.slice(-8)}
                            </span>
                            <span className="hidden md:inline">
                              {entry.wallet_address.slice(0, 12)}...{entry.wallet_address.slice(-12)}
                            </span>
                          </div>
                          <div className={`text-xs md:text-sm font-semibold ${
                            index < 3 ? 'text-black/80' : 'text-amber-400'
                          }`}>
                            🎯 {stats.games} {gameFilter === 'fight_dragon' ? 'battles' : 'games'} • 🏆 {stats.wins} victories
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Winnings - Right side on desktop, below on mobile */}
                  <div className="text-center md:text-right">
                    <div className={`text-xl md:text-2xl font-bold dragon-meme-text ${
                      index < 3 ? 'text-black' : 'text-amber-300'
                    }`}>
                      {stats.winnings.toFixed(2)} GOR
                    </div>
                    <div className={`text-xs md:text-sm font-semibold ${
                      index < 3 ? 'text-black/80' : 'text-amber-400'
                    }`}>
                      📊 {stats.winRate.toFixed(1)}% dragon power
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <div className="dragon-card rounded-xl p-4 md:p-6 text-center dragon-scale-hover border border-yellow-500/30">
          <Crown className="h-8 w-8 md:h-12 md:w-12 text-yellow-400 mx-auto mb-2 dragon-wing" />
          <div className="text-2xl md:text-3xl font-bold text-amber-300 dragon-meme-text">
            {sortedLeaderboard.length > 0 ? getFilteredStats(sortedLeaderboard[0]).winnings.toFixed(2) : '0'} GOR
          </div>
          <div className="text-xs md:text-sm text-amber-400 font-bold">👑 HIGHEST DRAGON TREASURE</div>
        </div>
        
        <div className="dragon-card rounded-xl p-4 md:p-6 text-center dragon-scale-hover border border-green-500/30">
          <TrendingUp className="h-8 w-8 md:h-12 md:w-12 text-green-400 mx-auto mb-2 dragon-breath" />
          <div className="text-2xl md:text-3xl font-bold text-amber-300 dragon-meme-text">{sortedLeaderboard.length}</div>
          <div className="text-xs md:text-sm text-amber-400 font-bold">🐲 ACTIVE DRAGON WARRIORS</div>
        </div>
        
        <div className="dragon-card rounded-xl p-4 md:p-6 text-center dragon-scale-hover border border-purple-500/30">
          <Award className="h-8 w-8 md:h-12 md:w-12 text-purple-400 mx-auto mb-2 dragon-wing" />
          <div className="text-2xl md:text-3xl font-bold text-amber-300 dragon-meme-text">
            {sortedLeaderboard.length > 0 
              ? Math.max(...sortedLeaderboard.map(p => getFilteredStats(p).winRate)).toFixed(1)
              : '0'
            }%
          </div>
          <div className="text-xs md:text-sm text-amber-400 font-bold">⚡ BEST DRAGON POWER</div>
        </div>
      </div>
    </div>
  )
}

export default Leaderboard