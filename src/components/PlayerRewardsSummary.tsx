import React, { useEffect, useState } from 'react'
import { Trophy, Gift, TrendingUp, Loader2, Crown, Flame } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useWallet } from '../contexts/WalletContext'

interface PlayerStats {
  totalWinnings: number
  totalClaimed: number
  totalUnclaimed: number
  gamesWon: number
  gamesPlayed: number
  winRate: number
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

  const fetchPlayerStats = async () => {
    if (!publicKey) return

    setLoading(true)
    try {
      const walletAddress = publicKey.toString()

      // Fetch all player records for this wallet
      const { data: playerRecords, error } = await supabase
        .from('players')
        .select('*')
        .eq('wallet_address', walletAddress)

      if (error) throw error

      if (!playerRecords || playerRecords.length === 0) {
        setStats({
          totalWinnings: 0,
          totalClaimed: 0,
          totalUnclaimed: 0,
          gamesWon: 0,
          gamesPlayed: 0,
          winRate: 0
        })
        return
      }

      // Calculate statistics
      const gamesPlayed = playerRecords.length
      const winners = playerRecords.filter(p => p.is_winner)
      const gamesWon = winners.length
      const winRate = gamesPlayed > 0 ? (gamesWon / gamesPlayed) * 100 : 0

      const totalWinnings = winners.reduce((sum, p) => sum + (p.prize_amount || 0), 0)
      const totalClaimed = winners
        .filter(p => p.reward_claimed)
        .reduce((sum, p) => sum + (p.prize_amount || 0), 0)
      const totalUnclaimed = winners
        .filter(p => !p.reward_claimed)
        .reduce((sum, p) => sum + (p.prize_amount || 0), 0)

      setStats({
        totalWinnings,
        totalClaimed,
        totalUnclaimed,
        gamesWon,
        gamesPlayed,
        winRate
      })

    } catch (error) {
      console.error('Error fetching player stats:', error)
    } finally {
      setLoading(false)
    }
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

  return (
    <div className="dragon-card rounded-xl p-6 dragon-shadow">
      <div className="flex items-center space-x-2 mb-6">
        <Crown className="h-8 w-8 text-yellow-400 dragon-wing" />
        <h3 className="text-2xl font-bold text-amber-300 dragon-meme-text">🏆 YOUR DRAGON TREASURES</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Total Winnings */}
        <div className="dragon-card rounded-lg p-4 text-center dragon-scale-hover border border-yellow-500/30">
          <Trophy className="h-10 w-10 text-yellow-400 mx-auto mb-2 dragon-wing" />
          <div className="text-3xl font-bold text-amber-300 dragon-meme-text">
            {stats.totalWinnings.toFixed(4)}
          </div>
          <div className="text-sm text-yellow-300 font-bold">💎 TOTAL DRAGON GOLD</div>
        </div>

        {/* Claimed Rewards */}
        <div className="dragon-card rounded-lg p-4 text-center dragon-scale-hover border border-green-500/30">
          <TrendingUp className="h-10 w-10 text-green-400 mx-auto mb-2 dragon-breath" />
          <div className="text-3xl font-bold text-amber-300 dragon-meme-text">
            {stats.totalClaimed.toFixed(4)}
          </div>
          <div className="text-sm text-green-300 font-bold">💰 GOLD CLAIMED</div>
        </div>

        {/* Unclaimed Rewards */}
        <div className="dragon-card rounded-lg p-4 text-center dragon-scale-hover border border-orange-500/30">
          <Gift className="h-10 w-10 text-orange-400 mx-auto mb-2 dragon-breath" />
          <div className="text-3xl font-bold text-amber-300 dragon-meme-text">
            {stats.totalUnclaimed.toFixed(4)}
          </div>
          <div className="text-sm text-orange-300 font-bold">⏳ GOLD PENDING</div>
        </div>
      </div>

      {/* Game Statistics */}
      <div className="dragon-card rounded-lg p-4 border border-amber-500/30">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-amber-300 dragon-meme-text">{stats.gamesPlayed}</div>
            <div className="text-xs text-amber-400 font-bold">⚔️ BATTLES</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-300 dragon-meme-text">{stats.gamesWon}</div>
            <div className="text-xs text-amber-400 font-bold">🏆 VICTORIES</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-300 dragon-meme-text">{stats.winRate.toFixed(1)}%</div>
            <div className="text-xs text-amber-400 font-bold">🐉 POWER</div>
          </div>
        </div>
      </div>

      {/* Quick Action */}
      {stats.totalUnclaimed > 0 && (
        <div className="mt-4 p-3 dragon-fire-bg rounded-lg dragon-glow">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-bold text-black dragon-meme-text">🏆 UNCLAIMED DRAGON TREASURES!</div>
              <div className="text-xs text-black/80 font-semibold">
                {stats.totalUnclaimed.toFixed(4)} GOR awaiting your claim
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