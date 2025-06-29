import React, { useEffect, useState } from 'react'
import { Trophy, Medal, Award, TrendingUp, Crown, Flame, Star, Zap } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface LeaderboardEntry {
  wallet_address: string
  total_winnings: number
  games_played: number
  games_won: number
  win_rate: number
  level: number
}

const Leaderboard: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLeaderboard()
  }, [])

  const calculateLevel = (wins: number) => {
    if (wins >= 200) return 10
    if (wins >= 100) return 9
    if (wins >= 50) return 8
    if (wins >= 40) return 7
    if (wins >= 30) return 6
    if (wins >= 20) return 5
    if (wins >= 10) return 4
    if (wins >= 5) return 3
    if (wins >= 1) return 2
    return 1
  }

  const fetchLeaderboard = async () => {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('wallet_address, prize_amount, is_winner')

      if (error) throw error

      // Process data to create leaderboard
      const playerStats: { [key: string]: LeaderboardEntry } = {}

      data?.forEach((player) => {
        const address = player.wallet_address
        if (!playerStats[address]) {
          playerStats[address] = {
            wallet_address: address,
            total_winnings: 0,
            games_played: 0,
            games_won: 0,
            win_rate: 0,
            level: 1
          }
        }

        playerStats[address].games_played += 1
        playerStats[address].total_winnings += player.prize_amount || 0
        if (player.is_winner) {
          playerStats[address].games_won += 1
        }
      })

      // Calculate win rates, levels and sort by level first, then by total winnings
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
        return <Crown className="h-8 w-8 text-yellow-400 dragon-wing" />
      case 2:
        return <Trophy className="h-8 w-8 text-gray-300 dragon-breath" />
      case 3:
        return <Medal className="h-8 w-8 text-orange-400 dragon-scale-hover" />
      default:
        return <span className="text-2xl font-bold text-amber-400 dragon-meme-text">#{rank}</span>
    }
  }

  const getLevelIcon = (level: number) => {
    if (level >= 10) return <Crown className="h-6 w-6 text-purple-400 dragon-wing" />
    if (level >= 8) return <Star className="h-6 w-6 text-yellow-400 dragon-breath" />
    if (level >= 6) return <Award className="h-6 w-6 text-orange-400 dragon-scale-hover" />
    if (level >= 4) return <Trophy className="h-6 w-6 text-blue-400 dragon-breath" />
    if (level >= 2) return <Flame className="h-6 w-6 text-green-400 dragon-wing" />
    return <Zap className="h-6 w-6 text-gray-400 dragon-breath" />
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
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="dragon-card rounded-2xl p-6 dragon-shadow">
          <h1 className="text-4xl md:text-6xl font-bold text-amber-400 dragon-meme-text mb-4">
            🐉 DRAGON LEADERBOARD 🐉
          </h1>
          <p className="text-xl text-amber-300 font-bold dragon-meme-text">
            🏆 TOP 10 DRAGON WARRIORS BY LEVEL & POWER 🏆
          </p>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="dragon-card rounded-xl overflow-hidden dragon-shadow">
        <div className="px-6 py-4 border-b border-amber-500/30 dragon-fire-bg">
          <h2 className="text-2xl font-bold text-black dragon-meme-text">👑 HALL OF DRAGON CHAMPIONS</h2>
        </div>

        {leaderboard.length === 0 ? (
          <div className="text-center py-12">
            <Flame className="h-16 w-16 text-amber-400 mx-auto mb-4 dragon-breath" />
            <p className="text-amber-400 font-bold dragon-meme-text text-xl">🐉 NO DRAGON WARRIORS YET!</p>
            <p className="text-amber-500 font-semibold mt-2">Be the first to claim dragon power!</p>
          </div>
        ) : (
          <div className="divide-y divide-amber-500/30">
            {leaderboard.map((entry, index) => (
              <div
                key={entry.wallet_address}
                className={`px-6 py-6 flex items-center justify-between hover:bg-orange-900/20 transition-all dragon-scale-hover ${
                  index < 3 ? getRankBackground(index + 1) : 'dragon-card'
                }`}
              >
                <div className="flex items-center space-x-6">
                  <div className="flex-shrink-0 w-16 flex justify-center">
                    {getRankIcon(index + 1)}
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    {/* Level Badge */}
                    <div className="flex items-center space-x-2 bg-gray-800/50 rounded-lg px-3 py-2 border border-amber-500/30">
                      {getLevelIcon(entry.level)}
                      <div className="text-center">
                        <div className="text-lg font-bold text-amber-300 dragon-meme-text">
                          LVL {entry.level}
                        </div>
                        <div className="text-xs text-amber-500 font-semibold">
                          {getLevelTitle(entry.level)}
                        </div>
                      </div>
                    </div>
                    
                    {/* Wallet Info */}
                    <div>
                      <div className={`font-mono font-bold text-lg ${
                        index < 3 ? 'text-black' : 'text-amber-300'
                      }`}>
                        {entry.wallet_address.slice(0, 12)}...{entry.wallet_address.slice(-12)}
                      </div>
                      <div className={`text-sm font-semibold ${
                        index < 3 ? 'text-black/80' : 'text-amber-400'
                      }`}>
                        🎯 {entry.games_played} battles • 🏆 {entry.games_won} victories
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className={`text-2xl font-bold dragon-meme-text ${
                    index < 3 ? 'text-black' : 'text-amber-300'
                  }`}>
                    {entry.total_winnings.toFixed(2)} GOR
                  </div>
                  <div className={`text-sm font-semibold ${
                    index < 3 ? 'text-black/80' : 'text-amber-400'
                  }`}>
                    📊 {entry.win_rate.toFixed(1)}% dragon power
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="dragon-card rounded-xl p-6 text-center dragon-scale-hover border border-yellow-500/30">
          <Crown className="h-12 w-12 text-yellow-400 mx-auto mb-2 dragon-wing" />
          <div className="text-3xl font-bold text-amber-300 dragon-meme-text">
            {leaderboard.length > 0 ? leaderboard[0]?.total_winnings.toFixed(2) : '0'} GOR
          </div>
          <div className="text-sm text-amber-400 font-bold">👑 HIGHEST DRAGON TREASURE</div>
        </div>
        
        <div className="dragon-card rounded-xl p-6 text-center dragon-scale-hover border border-green-500/30">
          <TrendingUp className="h-12 w-12 text-green-400 mx-auto mb-2 dragon-breath" />
          <div className="text-3xl font-bold text-amber-300 dragon-meme-text">{leaderboard.length}</div>
          <div className="text-sm text-amber-400 font-bold">🐲 ACTIVE DRAGON WARRIORS</div>
        </div>
        
        <div className="dragon-card rounded-xl p-6 text-center dragon-scale-hover border border-purple-500/30">
          <Award className="h-12 w-12 text-purple-400 mx-auto mb-2 dragon-wing" />
          <div className="text-3xl font-bold text-amber-300 dragon-meme-text">
            {leaderboard.length > 0 
              ? Math.max(...leaderboard.map(p => p.win_rate)).toFixed(1)
              : '0'
            }%
          </div>
          <div className="text-sm text-amber-400 font-bold">⚡ BEST DRAGON POWER</div>
        </div>
      </div>
    </div>
  )
}

export default Leaderboard