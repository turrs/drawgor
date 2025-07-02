import React, { useEffect, useState } from 'react'
import { 
  Clock, 
  Users, 
  Trophy, 
  Hash, 
  Gift, 
  Loader2, 
  CheckCircle, 
  ExternalLink, 
  Calendar, 
  Award,
  Share2,
  Twitter,
  Flame,
  User,
  Swords
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useWallet } from '../contexts/WalletContext'
import { useNotifications } from '../hooks/useNotifications'
import NotificationContainer from '../components/NotificationContainer'

interface GameHistory {
  id: string
  created_at: string
  start_time: string
  end_time: string
  result_number: number | null
  status: string
  total_players: number
  total_amount: number
  game_type: 'drawgor' | 'fight_dragon'
  winners: {
    id: string
    wallet_address: string
    prize_amount: number
    reward_claimed: boolean
    transaction_hash: string | null
    reward_transaction_hash: string | null
  }[]
}

interface UserGameHistory {
  id: string
  lobby_id: string
  selected_number: number
  is_winner: boolean
  prize_amount: number
  reward_claimed: boolean
  created_at: string
  game_type: 'drawgor' | 'fight_dragon'
  lobby: {
    result_number: number | null
    status: string
    total_players: number
  }
}

const History: React.FC = () => {
  const [history, setHistory] = useState<GameHistory[]>([])
  const [userHistory, setUserHistory] = useState<UserGameHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [claimingRewards, setClaimingRewards] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<'all' | 'user'>('all')
  const [gameFilter, setGameFilter] = useState<'all' | 'drawgor' | 'fight_dragon'>('all')
  const { connected, publicKey } = useWallet()
  const { notifications, removeNotification, showSuccess, showError, showInfo } = useNotifications()

  useEffect(() => {
    fetchHistory()
    if (connected && publicKey) {
      fetchUserHistory()
    }
  }, [connected, publicKey])

  const fetchHistory = async () => {
    try {
      // Fetch DrawGor lobbies
      const { data: drawGorLobbies, error: drawGorError } = await supabase
        .from('lobbies')
        .select('*')
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(25)

      if (drawGorError) throw drawGorError

      // Fetch Fight Dragon battles
      const { data: fightDragonBattles, error: fightDragonError } = await supabase
        .from('fight_dragon_battles')
        .select('*')
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(25)

      if (fightDragonError) throw fightDragonError

      // Combine and process both game types
      const allGames = [
        ...(drawGorLobbies || []).map(lobby => ({ ...lobby, game_type: 'drawgor' as const })),
        ...(fightDragonBattles || []).map(battle => ({ ...battle, game_type: 'fight_dragon' as const }))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      // Fetch winners for each game
      const historyWithWinners = await Promise.all(
        allGames.map(async (game) => {
          const tableName = game.game_type === 'drawgor' ? 'players' : 'fight_dragon_players'
          const { data: winners, error: winnersError } = await supabase
            .from(tableName)
            .select('id, wallet_address, prize_amount, reward_claimed, transaction_hash, reward_transaction_hash')
            .eq('lobby_id', game.id)
            .eq('is_winner', true)

          if (winnersError) {
            console.error('Error fetching winners:', winnersError)
            return { ...game, winners: [] }
          }

          return { ...game, winners: winners || [] }
        })
      )

      setHistory(historyWithWinners)
    } catch (error) {
      console.error('Error fetching history:', error)
      showError('🐉 Dragon Error', 'Failed to load game history')
    } finally {
      setLoading(false)
    }
  }

  const fetchUserHistory = async () => {
    if (!publicKey) return

    try {
      const walletAddress = publicKey.toString()

      // Fetch DrawGor games
      const { data: drawGorGames, error: drawGorError } = await supabase
        .from('players')
        .select(`id, lobby_id, selected_number, is_winner, prize_amount, reward_claimed, created_at, lobbies!inner(result_number, status, total_players)`)
        .eq('wallet_address', walletAddress)
        .order('created_at', { ascending: false })

      if (drawGorError) throw drawGorError

      // Fetch Fight Dragon games
      const { data: fightDragonGames, error: fightDragonError } = await supabase
        .from('fight_dragon_players')
        .select(`id, lobby_id, selected_number, is_winner, prize_amount, reward_claimed, created_at, fight_dragon_battles!inner(result_number, status, total_players)`)
        .eq('wallet_address', walletAddress)
        .order('created_at', { ascending: false })

      if (fightDragonError) throw fightDragonError

      // Combine and format user history
      const combinedHistory = [
        ...(drawGorGames || []).map(game => ({
          ...game,
          game_type: 'drawgor' as const,
          lobby: game.lobbies
        })),
        ...(fightDragonGames || []).map(game => ({
          ...game,
          game_type: 'fight_dragon' as const,
          lobby: game.fight_dragon_battles
        }))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      setUserHistory(combinedHistory)
    } catch (error) {
      console.error('Error fetching user history:', error)
    }
  }

  const claimReward = async (playerId: string, prizeAmount: number, walletAddress: string, gameType: 'drawgor' | 'fight_dragon') => {
    if (!connected || !publicKey) {
      showError('🐉 Dragon Required', 'Please connect your wallet to claim rewards')
      return
    }

    if (publicKey.toString() !== walletAddress) {
      showError('🐉 Wrong Dragon', 'You can only claim rewards for your own wallet')
      return
    }

    try {
      setClaimingRewards(prev => new Set([...prev, playerId]))
      showInfo('🐉 Dragon Magic', `Initiating ${gameType === 'drawgor' ? 'DrawGor' : 'Fight Dragon'} reward claim...`)

      console.log('🎁 Starting claim process:', {
        playerId,
        prizeAmount,
        walletAddress,
        gameType
      })

      // Use appropriate endpoint based on game type
      const endpoint = gameType === 'drawgor' ? 'claim-reward' : 'fight-dragon-claim-reward'
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          player_id: playerId,
          wallet_address: walletAddress
        })
      })

      console.log('📡 Response status:', response.status)
      
      const result = await response.json()
      console.log('📊 Response data:', result)

      if (result.success) {
        const gameTypeDisplay = gameType === 'drawgor' ? 'DrawGor' : 'Fight Dragon'
        showSuccess(
          `🐉 ${gameTypeDisplay} Treasure Claimed!`, 
          `Successfully sent ${prizeAmount.toFixed(4)} GOR from ${gameTypeDisplay} to your dragon wallet! 💎`,
          10000
        )
        
        await fetchHistory()
        if (connected && publicKey) {
          await fetchUserHistory()
        }
      } else {
        throw new Error(result.error || result.technical_error || 'Failed to claim reward')
      }

    } catch (error) {
      console.error('❌ Error claiming reward:', error)
      
      let errorMessage = error.message
      if (errorMessage.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds in the dragon treasure pool. Please contact support.'
      } else if (errorMessage.includes('already claimed')) {
        errorMessage = 'This dragon treasure has already been claimed.'
      } else if (errorMessage.includes('not found')) {
        errorMessage = 'Dragon treasure not found or invalid claim request.'
      }
      
      showError('🐉 Claim Failed', errorMessage, 10000)
    } finally {
      setClaimingRewards(prev => {
        const newSet = new Set(prev)
        newSet.delete(playerId)
        return newSet
      })
    }
  }

  const shareWin = async (game: GameHistory, winner: any) => {
    if (!connected || !publicKey || winner.wallet_address !== publicKey.toString()) return

    const gameTypeDisplay = game.game_type === 'drawgor' ? 'DrawGor' : 'Fight Dragon'
    const gameEmoji = game.game_type === 'drawgor' ? '🐉' : '⚔️'
    
    const tweetText = `${gameEmoji} ${gameTypeDisplay.toUpperCase()} VICTORY! Just won ${winner.prize_amount.toFixed(4)} GOR! 🔥

🎯 Winning Number: ${game.result_number}
💎 Dragon Treasure: ${winner.prize_amount.toFixed(4)} GOR
${game.game_type === 'drawgor' ? 
  `⚔️ Defeated ${game.total_players - 1} other dragon warrior${game.total_players > 2 ? 's' : ''}!` :
  `🛡️ Emerged victorious in epic dragon battle!`
}

Join the dragon ${game.game_type === 'drawgor' ? 'draws' : 'battles'} and claim your treasure! 🐲

#GorbaganaTestnet #DrawGor #DragonPower #BlockchainGaming #GORChain #CryptoGaming #DragonVictory

@Gorbagana_chain @Sarv_shaktiman @lex_node`

    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`
    
    window.open(tweetUrl, '_blank', 'noopener,noreferrer')
    
    showSuccess('🐉 Dragon Roar!', `Twitter opened with your epic ${gameTypeDisplay} victory ready to share!`)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDuration = (startTime: string, endTime: string) => {
    const start = new Date(startTime)
    const end = new Date(endTime)
    const duration = Math.floor((end.getTime() - start.getTime()) / 1000)
    const minutes = Math.floor(duration / 60)
    const seconds = duration % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const getGameIcon = (gameType: 'drawgor' | 'fight_dragon') => {
    return gameType === 'drawgor' ? 
      <Flame className="h-4 w-4 text-blue-400 dragon-breath" /> :
      <Swords className="h-4 w-4 text-red-400 dragon-breath" />
  }

  const getGameTypeDisplay = (gameType: 'drawgor' | 'fight_dragon') => {
    return gameType === 'drawgor' ? '🐉 DrawGor' : '⚔️ Fight Dragon'
  }

  // Filter history based on game type
  const filteredHistory = gameFilter === 'all' ? history : history.filter(game => game.game_type === gameFilter)
  const filteredUserHistory = gameFilter === 'all' ? userHistory : userHistory.filter(game => game.game_type === gameFilter)

  // Get user's unclaimed rewards
  const getUserUnclaimedRewards = () => {
    if (!connected || !publicKey) return []
    
    const userAddress = publicKey.toString()
    const unclaimedRewards: Array<{
      gameId: string
      playerId: string
      prizeAmount: number
      gameDate: string
      gameType: 'drawgor' | 'fight_dragon'
    }> = []

    filteredHistory.forEach(game => {
      game.winners.forEach(winner => {
        if (winner.wallet_address === userAddress && !winner.reward_claimed) {
          unclaimedRewards.push({
            gameId: game.id,
            playerId: winner.id,
            prizeAmount: winner.prize_amount,
            gameDate: game.created_at,
            gameType: game.game_type
          })
        }
      })
    })

    return unclaimedRewards
  }

  const unclaimedRewards = getUserUnclaimedRewards()

  if (loading) {
    return (
      <>
        <NotificationContainer notifications={notifications} onClose={removeNotification} />
        <div className="flex items-center justify-center py-20">
          <div className="dragon-card rounded-2xl p-8 text-center dragon-glow">
            <Flame className="h-12 w-12 text-orange-500 mx-auto mb-4 dragon-breath" />
            <p className="text-amber-300 text-xl font-bold dragon-meme-text">🐉 AWAKENING DRAGON HISTORY...</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <NotificationContainer notifications={notifications} onClose={removeNotification} />
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="dragon-card rounded-2xl p-6 dragon-shadow">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <Calendar className="h-8 w-8 text-amber-400 dragon-breath" />
              <h1 className="text-3xl font-bold text-amber-400 dragon-meme-text">🐉 DRAGON BATTLE HISTORY</h1>
            </div>
            <p className="text-amber-400 font-semibold">
              Track your dragon journey across all game modes and claim your epic treasures 🏆
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center space-x-4">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-6 py-3 rounded-lg font-bold transition-all dragon-scale-hover ${
              activeTab === 'all'
                ? 'dragon-button dragon-glow'
                : 'dragon-card border border-amber-500/30 text-amber-300 hover:text-amber-100'
            }`}
          >
            🏛️ ALL BATTLES
          </button>
          {connected && (
            <button
              onClick={() => setActiveTab('user')}
              className={`px-6 py-3 rounded-lg font-bold transition-all dragon-scale-hover ${
                activeTab === 'user'
                  ? 'dragon-button dragon-glow'
                  : 'dragon-card border border-amber-500/30 text-amber-300 hover:text-amber-100'
              }`}
            >
              🐲 MY BATTLES
            </button>
          )}
        </div>

        {/* Game Type Filter */}
        <div className="flex justify-center space-x-2">
          <button
            onClick={() => setGameFilter('all')}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all dragon-scale-hover ${
              gameFilter === 'all'
                ? 'dragon-fire-bg text-black'
                : 'dragon-card border border-amber-500/30 text-amber-300 hover:text-amber-100'
            }`}
          >
            🎮 ALL GAMES
          </button>
          <button
            onClick={() => setGameFilter('drawgor')}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all dragon-scale-hover ${
              gameFilter === 'drawgor'
                ? 'dragon-fire-bg text-black'
                : 'dragon-card border border-amber-500/30 text-amber-300 hover:text-amber-100'
            }`}
          >
            🐉 DRAWGOR
          </button>
          <button
            onClick={() => setGameFilter('fight_dragon')}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all dragon-scale-hover ${
              gameFilter === 'fight_dragon'
                ? 'dragon-fire-bg text-black'
                : 'dragon-card border border-amber-500/30 text-amber-300 hover:text-amber-100'
            }`}
          >
            ⚔️ FIGHT DRAGON
          </button>
        </div>

        {/* Unclaimed Rewards Section */}
        {connected && unclaimedRewards.length > 0 && activeTab === 'all' && (
          <div className="relative overflow-hidden dragon-fire-bg rounded-2xl p-8 dragon-shadow">
            <div className="absolute top-4 left-4 text-3xl animate-bounce">🐉</div>
            <div className="absolute top-4 right-4 text-2xl animate-pulse">💎</div>
            <div className="absolute bottom-4 left-4 text-2xl animate-bounce delay-300">🔥</div>
            <div className="absolute bottom-4 right-4 text-3xl animate-pulse delay-500">⚔️</div>
            
            <div className="relative">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-black/20 rounded-lg">
                  <Gift className="h-8 w-8 text-black" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white dragon-meme-text">🏆 UNCLAIMED DRAGON TREASURES</h2>
                  <p className="text-white font-semibold">
                    {unclaimedRewards.length} treasure{unclaimedRewards.length !== 1 ? 's' : ''} awaiting your claim!
                  </p>
                </div>
              </div>
              
              <div className="grid gap-4">
                {unclaimedRewards.map((reward) => (
                  <div
                    key={reward.playerId}
                    className="bg-black/20 backdrop-blur-sm border border-black/30 rounded-xl p-4 flex items-center justify-between hover:bg-black/30 transition-all duration-200"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="p-2 bg-black/20 rounded-lg">
                        {getGameIcon(reward.gameType)}
                      </div>
                      <div>
                        <div className="text-white font-bold text-xl dragon-meme-text">
                          {reward.prizeAmount.toFixed(4)} GOR
                        </div>
                        <div className="text-black/70 font-semibold text-sm">
                          {getGameTypeDisplay(reward.gameType)} • {formatDate(reward.gameDate)}
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => claimReward(reward.playerId, reward.prizeAmount, publicKey!.toString(), reward.gameType)}
                      disabled={claimingRewards.has(reward.playerId)}
                      className="bg-black hover:bg-gray-800 text-amber-300 px-6 py-3 rounded-lg font-bold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 dragon-scale-hover"
                    >
                      {claimingRewards.has(reward.playerId) ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>CLAIMING...</span>
                        </>
                      ) : (
                        <>
                          <Gift className="h-4 w-4" />
                          <span>CLAIM TREASURE</span>
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* History Content */}
        {activeTab === 'all' ? (
          // All Games History
          <div className="space-y-4">
            {filteredHistory.length === 0 ? (
              <div className="text-center py-16">
                <div className="dragon-card rounded-2xl p-8 dragon-shadow">
                  <Clock className="h-16 w-16 text-amber-400 mx-auto mb-4 dragon-breath" />
                  <h3 className="text-2xl font-bold text-amber-300 mb-2 dragon-meme-text">🐉 NO DRAGON BATTLES YET</h3>
                  <p className="text-amber-400 max-w-sm mx-auto font-semibold">
                    Dragon battle history will appear here after the first epic confrontation
                  </p>
                </div>
              </div>
            ) : (
              filteredHistory.map((game) => (
                <div
                  key={game.id}
                  className="dragon-card rounded-xl p-6 hover:bg-orange-900/20 transition-all duration-200 dragon-scale-hover"
                >
                  {/* Game Header */}
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 mb-4">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-3">
                        {getGameIcon(game.game_type)}
                        <span className="font-bold text-amber-300 dragon-meme-text">
                          {getGameTypeDisplay(game.game_type)}
                        </span>
                        <div className="flex items-center space-x-2 text-amber-400">
                          <Hash className="h-4 w-4" />
                          <span className="font-mono text-sm font-semibold">
                            {game.id.slice(0, 8)}...{game.id.slice(-8)}
                          </span>
                        </div>
                        <div className="text-amber-500 text-sm font-semibold">
                          {formatDate(game.created_at)}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-6">
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-blue-400 dragon-breath" />
                          <span className="text-sm text-amber-300 font-semibold">
                            {formatDuration(game.start_time, game.end_time)}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Users className="h-4 w-4 text-green-400 dragon-wing" />
                          <span className="text-sm text-amber-300 font-semibold">
                            {game.total_players} {game.game_type === 'drawgor' ? 'warriors' : 'fighters'}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Trophy className="h-4 w-4 text-yellow-400 dragon-breath" />
                          <span className="text-sm text-amber-300 font-semibold">
                            {game.total_amount.toFixed(1)} GOR
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Winning Number */}
                    <div className="flex items-center space-x-4">
                      <div className="text-center">
                        <div className="text-xs text-amber-400 mb-2 font-bold">
                          {game.game_type === 'drawgor' ? '🐉 DRAGON NUMBER' : '⚔️ VICTOR'}
                        </div>
                        <div className="dragon-winner rounded-xl flex items-center justify-center font-bold text-2xl shadow-lg w-16 h-16">
                          {game.result_number}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Winners Section */}
                  {game.winners.length > 0 && (
                    <div className="border-t border-amber-500/30 pt-4">
                      <div className="flex items-center space-x-2 mb-3">
                        <Award className="h-5 w-5 text-yellow-400 dragon-wing" />
                        <span className="text-sm font-bold text-amber-300 dragon-meme-text">
                          🏆 {game.game_type === 'drawgor' ? 'DRAGON CHAMPIONS' : 'BATTLE VICTORS'} ({game.winners.length})
                        </span>
                      </div>
                      
                      <div className="grid gap-3">
                        {game.winners.map((winner, index) => (
                          <div
                            key={index}
                            className="bg-green-900/20 border border-green-700/50 rounded-lg px-4 py-3 flex items-center justify-between dragon-scale-hover"
                          >
                            <div className="flex items-center space-x-3">
                              <span className="font-mono text-sm text-green-300 font-semibold">
                                {winner.wallet_address.slice(0, 12)}...{winner.wallet_address.slice(-12)}
                              </span>
                              <span className="font-bold text-green-400 dragon-meme-text">
                                {winner.prize_amount.toFixed(4)} GOR
                              </span>
                            </div>
                            
                            <div className="flex items-center space-x-3">
                              {winner.reward_claimed ? (
                                <div className="flex items-center space-x-2">
                                  <div className="flex items-center space-x-1 text-green-400">
                                    <CheckCircle className="h-4 w-4" />
                                    <span className="text-xs font-bold">CLAIMED</span>
                                  </div>
                                  {winner.reward_transaction_hash && (
                                    <a
                                      href={`https://explorer.gorbagana.wtf/tx/${winner.reward_transaction_hash}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-400 hover:text-blue-300 transition-colors p-1 hover:bg-blue-400/10 rounded"
                                      title="View reward transaction on explorer"
                                    >
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  )}
                                  
                                  {connected && 
                                   publicKey && 
                                   winner.wallet_address === publicKey.toString() && (
                                    <button
                                      onClick={() => shareWin(game, winner)}
                                      className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs font-bold transition-colors flex items-center space-x-1 dragon-scale-hover"
                                      title="Share your dragon victory on Twitter"
                                    >
                                      <Twitter className="h-3 w-3" />
                                      <span>SHARE</span>
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <div className="flex items-center space-x-2">
                                  <div className="flex items-center space-x-1 text-amber-400">
                                    <Gift className="h-4 w-4" />
                                    <span className="text-xs font-bold">UNCLAIMED</span>
                                  </div>
                                  
                                  {connected && 
                                   publicKey && 
                                   winner.wallet_address === publicKey.toString() && (
                                    <button
                                      onClick={() => claimReward(winner.id, winner.prize_amount, winner.wallet_address, game.game_type)}
                                      disabled={claimingRewards.has(winner.id)}
                                      className="dragon-button px-3 py-1 rounded-lg text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1 dragon-scale-hover"
                                    >
                                      {claimingRewards.has(winner.id) ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <>
                                          <Gift className="h-3 w-3" />
                                          <span>CLAIM</span>
                                        </>
                                      )}
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {game.winners.length === 0 && (
                    <div className="border-t border-amber-500/30 pt-4">
                      <div className="text-center text-amber-400 text-sm py-2 font-semibold">
                        🐉 No {game.game_type === 'drawgor' ? 'dragon champions' : 'battle victors'} this round
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        ) : (
          // User Games History
          <div className="space-y-4">
            {!connected ? (
              <div className="text-center py-16">
                <div className="dragon-card rounded-2xl p-8 dragon-shadow">
                  <User className="h-16 w-16 text-amber-400 mx-auto mb-4 dragon-breath" />
                  <h3 className="text-2xl font-bold text-amber-300 mb-2 dragon-meme-text">🐉 CONNECT YOUR DRAGON WALLET</h3>
                  <p className="text-amber-400 max-w-sm mx-auto font-semibold">
                    Connect your wallet to view your personal dragon battle history
                  </p>
                </div>
              </div>
            ) : filteredUserHistory.length === 0 ? (
              <div className="text-center py-16">
                <div className="dragon-card rounded-2xl p-8 dragon-shadow">
                  <Flame className="h-16 w-16 text-amber-400 mx-auto mb-4 dragon-breath" />
                  <h3 className="text-2xl font-bold text-amber-300 mb-2 dragon-meme-text">🐉 NO BATTLES YET</h3>
                  <p className="text-amber-400 max-w-sm mx-auto font-semibold">
                    Your dragon battle history will appear here after you join your first epic battle
                  </p>
                </div>
              </div>
            ) : (
              filteredUserHistory.map((game) => (
                <div
                  key={game.id}
                  className={`dragon-card rounded-xl p-6 transition-all duration-200 dragon-scale-hover ${
                    game.is_winner ? 'border border-green-500/50 dragon-glow' : 'border border-amber-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {/* Game Type Icon */}
                      <div className="flex items-center space-x-2">
                        {getGameIcon(game.game_type)}
                        <span className="text-amber-400 font-bold text-sm dragon-meme-text">
                          {getGameTypeDisplay(game.game_type)}
                        </span>
                      </div>
                      
                      {/* User's Number */}
                      <div className={`w-16 h-16 rounded-xl flex items-center justify-center font-bold text-2xl ${
                        game.is_winner ? 'dragon-winner' : 'dragon-number'
                      }`}>
                        {game.selected_number}
                      </div>
                      
                      <div>
                        <div className="flex items-center space-x-3 mb-1">
                          <span className="text-amber-300 font-bold dragon-meme-text">
                            {game.is_winner ? 
                              (game.game_type === 'drawgor' ? '🏆 DRAGON VICTORY!' : '⚔️ BATTLE WON!') : 
                              (game.game_type === 'drawgor' ? '⚔️ Dragon Battle' : '🛡️ Dragon Duel')
                            }
                          </span>
                          <span className="text-amber-500 text-sm font-semibold">
                            {formatDate(game.created_at)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-amber-400">
                          <span className="font-semibold">
                            🎯 Winning: {game.lobby.result_number || '?'}
                          </span>
                          <span className="font-semibold">
                            👥 {game.lobby.total_players} {game.game_type === 'drawgor' ? 'warriors' : 'fighters'}
                          </span>
                          {game.is_winner && (
                            <span className="font-bold text-green-400">
                              💎 {game.prize_amount.toFixed(4)} GOR
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-2">
                      {game.is_winner && !game.reward_claimed && (
                        <button
                          onClick={() => claimReward(game.id, game.prize_amount, publicKey!.toString(), game.game_type)}
                          disabled={claimingRewards.has(game.id)}
                          className="dragon-button px-4 py-2 rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 dragon-scale-hover"
                        >
                          {claimingRewards.has(game.id) ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>CLAIMING...</span>
                            </>
                          ) : (
                            <>
                              <Gift className="h-4 w-4" />
                              <span>CLAIM</span>
                            </>
                          )}
                        </button>
                      )}
                      
                      {game.is_winner && game.reward_claimed && (
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center space-x-1 text-green-400">
                            <CheckCircle className="h-4 w-4" />
                            <span className="text-sm font-bold">CLAIMED</span>
                          </div>
                          <button
                            onClick={() => {
                              const gameData = filteredHistory.find(h => h.id === game.lobby_id)
                              const winnerData = gameData?.winners.find(w => w.wallet_address === publicKey?.toString())
                              if (gameData && winnerData) {
                                shareWin(gameData, winnerData)
                              }
                            }}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm font-bold transition-colors flex items-center space-x-1 dragon-scale-hover"
                          >
                            <Twitter className="h-3 w-3" />
                            <span>SHARE</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </>
  )
}

export default History