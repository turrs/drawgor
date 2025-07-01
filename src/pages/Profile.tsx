import React, { useEffect, useState } from 'react'
import { 
  User, 
  Trophy, 
  TrendingUp, 
  Award, 
  Star, 
  Share2, 
  Download,
  Loader2,
  Wallet,
  Target,
  Zap,
  Crown,
  Flame,
  Twitter,
  Swords
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useWallet } from '../contexts/WalletContext'
import { useNotifications } from '../hooks/useNotifications'
import NotificationContainer from '../components/NotificationContainer'

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
  
  // Combined stats
  totalCombinedWinnings: number
  totalCombinedGames: number
  totalCombinedWins: number
  overallWinRate: number
  level: number
  nextLevelWins: number
  winsToNextLevel: number
}

const Profile: React.FC = () => {
  const { connected, publicKey } = useWallet()
  const [stats, setStats] = useState<PlayerStats | null>(null)
  const [loading, setLoading] = useState(false)
  const { notifications, removeNotification, showSuccess, showError } = useNotifications()

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
      const totalCombinedGames = drawGorPlayed + fightDragonPlayed
      const totalCombinedWinnings = drawGorTotalWinnings + fightDragonTotalWinnings
      const overallWinRate = totalCombinedGames > 0 ? (totalCombinedWins / totalCombinedGames) * 100 : 0
      
      const { level, nextLevelWins, winsToNextLevel } = calculateLevel(totalCombinedWins)

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
        
        totalCombinedWinnings,
        totalCombinedGames,
        totalCombinedWins,
        overallWinRate,
        level,
        nextLevelWins,
        winsToNextLevel
      })

    } catch (error) {
      console.error('Error fetching player stats:', error)
      showError('🐉 Dragon Error', 'Failed to load profile statistics')
    } finally {
      setLoading(false)
    }
  }

  const calculateLevel = (wins: number) => {
    const levelThresholds = [
      { level: 1, wins: 0 },
      { level: 2, wins: 1 },
      { level: 3, wins: 5 },
      { level: 4, wins: 10 },
      { level: 5, wins: 20 },
      { level: 6, wins: 30 },
      { level: 7, wins: 40 },
      { level: 8, wins: 50 },
      { level: 9, wins: 100 },
      { level: 10, wins: 200 }
    ]

    let currentLevel = 1
    let nextLevelWins = 1
    
    for (let i = levelThresholds.length - 1; i >= 0; i--) {
      if (wins >= levelThresholds[i].wins) {
        currentLevel = levelThresholds[i].level
        nextLevelWins = i < levelThresholds.length - 1 ? levelThresholds[i + 1].wins : levelThresholds[i].wins
        break
      }
    }

    const winsToNextLevel = Math.max(0, nextLevelWins - wins)

    return { level: currentLevel, nextLevelWins, winsToNextLevel }
  }

  const getLevelIcon = (level: number) => {
    if (level >= 10) return <Crown className="h-8 w-8 text-purple-400 dragon-wing" />
    if (level >= 8) return <Star className="h-8 w-8 text-yellow-400 dragon-breath" />
    if (level >= 6) return <Award className="h-8 w-8 text-orange-400 dragon-scale-hover" />
    if (level >= 4) return <Trophy className="h-8 w-8 text-blue-400 dragon-breath" />
    if (level >= 2) return <Target className="h-8 w-8 text-green-400 dragon-wing" />
    return <Zap className="h-8 w-8 text-gray-400 dragon-breath" />
  }

  const getLevelColor = (level: number) => {
    if (level >= 10) return 'from-purple-500 via-pink-500 to-purple-600'
    if (level >= 8) return 'from-yellow-400 via-orange-500 to-red-500'
    if (level >= 6) return 'from-orange-400 via-red-500 to-pink-500'
    if (level >= 4) return 'from-blue-400 via-cyan-500 to-teal-500'
    if (level >= 2) return 'from-green-400 via-emerald-500 to-green-600'
    return 'from-gray-400 via-gray-500 to-gray-600'
  }

  const getLevelTitle = (level: number) => {
    if (level >= 10) return '🐉 DRAGON EMPEROR'
    if (level >= 8) return '👑 DRAGON KING'
    if (level >= 6) return '🔥 DRAGON LORD'
    if (level >= 4) return '⚡ DRAGON KNIGHT'
    if (level >= 2) return '🗡️ DRAGON WARRIOR'
    return '🥚 DRAGON EGG'
  }

  const shareProfileOnTwitter = async () => {
    if (!stats || !publicKey) return

    try {
      const levelTitle = getLevelTitle(stats.level)
      const tweetText = `🐉 Check out my DrawGor Dragon Profile! 🐉

${levelTitle} - Level ${stats.level}
🏆 Total Victories: ${stats.totalCombinedWins}
🎯 Total Games: ${stats.totalCombinedGames}
📊 Overall Win Rate: ${stats.overallWinRate.toFixed(1)}%
💎 Total Winnings: ${stats.totalCombinedWinnings.toFixed(4)} GOR

🐉 DrawGor: ${stats.gamesWon}/${stats.gamesPlayed} wins
⚔️ Fight Dragon: ${stats.fightDragonWins}/${stats.fightDragonBattles} wins

Join the dragon battles at DrawGor! 🔥

#GorbaganaTestnet #DrawGor #DragonPower #BlockchainGaming #GORChain #CryptoGaming #DragonWarrior

@Gorbagana_chain @Sarv_shaktiman @lex_node`

      const tweetUrl = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(tweetText)
      
      window.open(tweetUrl, '_blank', 'noopener,noreferrer')
      
      showSuccess('🐉 Dragon Roar!', 'Twitter opened with your epic dragon profile ready to share!')

    } catch (error) {
      console.error('Error sharing profile:', error)
      showError('🐉 Dragon Failed', 'Failed to share profile')
    }
  }

  if (!connected) {
    return (
      <>
        <NotificationContainer notifications={notifications} onClose={removeNotification} />
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center space-y-6">
            <div className="dragon-card rounded-2xl p-8 dragon-shadow">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-orange-900/30 rounded-full mb-4">
                <User className="h-10 w-10 text-amber-400 dragon-breath" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-amber-300 dragon-meme-text">🐉 CONNECT YOUR DRAGON WALLET</h2>
                <p className="text-amber-400 max-w-md mx-auto font-semibold">
                  Connect your wallet to view your dragon profile, battle statistics, and epic achievements across all game modes
                </p>
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  if (loading) {
    return (
      <>
        <NotificationContainer notifications={notifications} onClose={removeNotification} />
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="dragon-card rounded-2xl p-8 text-center dragon-glow">
            <Flame className="h-12 w-12 text-orange-500 mx-auto mb-4 dragon-breath" />
            <p className="text-amber-300 text-xl font-bold dragon-meme-text">🐉 AWAKENING DRAGON PROFILE...</p>
          </div>
        </div>
      </>
    )
  }

  if (!stats) {
    return (
      <>
        <NotificationContainer notifications={notifications} onClose={removeNotification} />
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="dragon-card rounded-2xl p-8 text-center">
            <p className="text-amber-300 text-lg font-bold dragon-meme-text">🐉 FAILED TO LOAD DRAGON PROFILE</p>
          </div>
        </div>
      </>
    )
  }

  const totalUnclaimed = stats.totalUnclaimed + stats.fightDragonUnclaimed

  return (
    <>
      <NotificationContainer notifications={notifications} onClose={removeNotification} />
      <div className="space-y-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="dragon-card rounded-2xl p-6 dragon-shadow">
            <div className="flex items-center justify-center space-x-3">
              <User className="h-8 w-8 text-amber-400 dragon-breath" />
              <h1 className="text-3xl font-bold text-amber-400 dragon-meme-text">🐉 DRAGON WARRIOR PROFILE</h1>
            </div>
          </div>
        </div>

        {/* Level Card - Hero Section */}
        <div className={`relative overflow-hidden bg-gradient-to-br ${getLevelColor(stats.level)} rounded-2xl p-8 text-center dragon-shadow`}>
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm"></div>
          <div className="absolute inset-0 dragon-fire-bg opacity-30"></div>
          
          {/* Floating Dragon Emojis */}
          <div className="absolute top-4 left-4 text-3xl animate-bounce">🐉</div>
          <div className="absolute top-4 right-4 text-2xl animate-pulse">🔥</div>
          <div className="absolute bottom-4 left-4 text-2xl animate-bounce delay-300">⚔️</div>
          <div className="absolute bottom-4 right-4 text-3xl animate-pulse delay-500">💎</div>
          
          <div className="relative z-10 space-y-6">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-white/20 backdrop-blur-sm rounded-full dragon-glow">
              {getLevelIcon(stats.level)}
            </div>
            <div>
              <h2 className="text-5xl font-bold text-white mb-2 dragon-meme-text">
                LEVEL {stats.level}
              </h2>
              <p className="text-white/90 text-2xl font-bold dragon-meme-text mb-2">
                {getLevelTitle(stats.level)}
              </p>
              <p className="text-white/80 text-lg font-semibold">
                {stats.level >= 10 ? '🏆 MAXIMUM DRAGON POWER ACHIEVED! 🏆' : `${stats.winsToNextLevel} wins to Level ${stats.level + 1}`}
              </p>
            </div>
            
            {/* Progress Bar */}
            {stats.level < 10 && (
              <div className="max-w-md mx-auto">
                <div className="bg-white/20 rounded-full h-4 overflow-hidden">
                  <div 
                    className="dragon-fire-bg h-full transition-all duration-1000"
                    style={{ 
                      width: `${((stats.totalCombinedWins - (stats.nextLevelWins - stats.winsToNextLevel - stats.totalCombinedWins)) / stats.winsToNextLevel) * 100}%` 
                    }}
                  ></div>
                </div>
                <p className="text-white/70 text-sm mt-2 font-semibold">
                  {stats.totalCombinedWins} / {stats.nextLevelWins} dragon victories
                </p>
              </div>
            )}

            {/* Share Button */}
            <button
              onClick={shareProfileOnTwitter}
              className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-4 rounded-lg font-bold text-lg transition-all duration-200 flex items-center space-x-3 mx-auto dragon-scale-hover dragon-shadow"
            >
              <Twitter className="h-6 w-6" />
              <span className="dragon-meme-text">🐉 SHARE DRAGON POWER!</span>
            </button>
          </div>
        </div>

        {/* Wallet Info */}
        <div className="dragon-card rounded-xl p-6 dragon-shadow">
          <div className="flex items-center space-x-3 mb-4">
            <Wallet className="h-6 w-6 text-amber-400 dragon-breath" />
            <h3 className="text-xl font-bold text-amber-300 dragon-meme-text">🐲 DRAGON WALLET INFO</h3>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4 border border-amber-500/30">
            <p className="text-amber-400 text-sm mb-1 font-semibold">Dragon Wallet Address</p>
            <p className="font-mono text-amber-300 break-all font-bold">{publicKey.toString()}</p>
          </div>
        </div>

        {/* Game Mode Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* DrawGor Stats */}
          <div className="dragon-card rounded-xl p-6 dragon-shadow border border-blue-500/30">
            <div className="flex items-center space-x-3 mb-4">
              <Flame className="h-6 w-6 text-blue-400 dragon-breath" />
              <h3 className="text-xl font-bold text-amber-300 dragon-meme-text">🐉 DRAWGOR STATS</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center dragon-scale-hover">
                <div className="text-3xl font-bold text-amber-300 mb-1 dragon-meme-text">{stats.gamesWon}</div>
                <div className="text-blue-300 text-sm font-bold">🏆 VICTORIES</div>
              </div>
              <div className="text-center dragon-scale-hover">
                <div className="text-3xl font-bold text-amber-300 mb-1 dragon-meme-text">{stats.gamesPlayed}</div>
                <div className="text-blue-300 text-sm font-bold">🎯 GAMES</div>
              </div>
              <div className="text-center dragon-scale-hover">
                <div className="text-3xl font-bold text-amber-300 mb-1 dragon-meme-text">{stats.winRate.toFixed(1)}%</div>
                <div className="text-blue-300 text-sm font-bold">📊 WIN RATE</div>
              </div>
              <div className="text-center dragon-scale-hover">
                <div className="text-3xl font-bold text-amber-300 mb-1 dragon-meme-text">{stats.totalWinnings.toFixed(2)}</div>
                <div className="text-blue-300 text-sm font-bold">💎 GOR WON</div>
              </div>
            </div>
          </div>

          {/* Fight Dragon Stats */}
          <div className="dragon-card rounded-xl p-6 dragon-shadow border border-red-500/30">
            <div className="flex items-center space-x-3 mb-4">
              <Swords className="h-6 w-6 text-red-400 dragon-breath" />
              <h3 className="text-xl font-bold text-amber-300 dragon-meme-text">⚔️ FIGHT DRAGON STATS</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center dragon-scale-hover">
                <div className="text-3xl font-bold text-amber-300 mb-1 dragon-meme-text">{stats.fightDragonWins}</div>
                <div className="text-red-300 text-sm font-bold">⚔️ VICTORIES</div>
              </div>
              <div className="text-center dragon-scale-hover">
                <div className="text-3xl font-bold text-amber-300 mb-1 dragon-meme-text">{stats.fightDragonBattles}</div>
                <div className="text-red-300 text-sm font-bold">🛡️ BATTLES</div>
              </div>
              <div className="text-center dragon-scale-hover">
                <div className="text-3xl font-bold text-amber-300 mb-1 dragon-meme-text">{stats.fightDragonWinRate.toFixed(1)}%</div>
                <div className="text-red-300 text-sm font-bold">📊 WIN RATE</div>
              </div>
              <div className="text-center dragon-scale-hover">
                <div className="text-3xl font-bold text-amber-300 mb-1 dragon-meme-text">{stats.fightDragonWinnings.toFixed(2)}</div>
                <div className="text-red-300 text-sm font-bold">💎 GOR WON</div>
              </div>
            </div>
          </div>
        </div>

        {/* Overall Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="dragon-card rounded-xl p-6 text-center dragon-scale-hover border border-yellow-500/30">
            <Trophy className="h-10 w-10 text-yellow-400 mx-auto mb-3 dragon-wing" />
            <div className="text-3xl font-bold text-amber-300 mb-1 dragon-meme-text">{stats.totalCombinedWins}</div>
            <div className="text-yellow-300 text-sm font-bold">🏆 TOTAL VICTORIES</div>
          </div>

          <div className="dragon-card rounded-xl p-6 text-center dragon-scale-hover border border-blue-500/30">
            <Target className="h-10 w-10 text-blue-400 mx-auto mb-3 dragon-breath" />
            <div className="text-3xl font-bold text-amber-300 mb-1 dragon-meme-text">{stats.totalCombinedGames}</div>
            <div className="text-blue-300 text-sm font-bold">⚔️ TOTAL BATTLES</div>
          </div>

          <div className="dragon-card rounded-xl p-6 text-center dragon-scale-hover border border-purple-500/30">
            <TrendingUp className="h-10 w-10 text-purple-400 mx-auto mb-3 dragon-wing" />
            <div className="text-3xl font-bold text-amber-300 mb-1 dragon-meme-text">{stats.overallWinRate.toFixed(1)}%</div>
            <div className="text-purple-300 text-sm font-bold">📊 OVERALL POWER</div>
          </div>

          <div className="dragon-card rounded-xl p-6 text-center dragon-scale-hover border border-green-500/30">
            <Award className="h-10 w-10 text-green-400 mx-auto mb-3 dragon-breath" />
            <div className="text-3xl font-bold text-amber-300 mb-1 dragon-meme-text">{stats.totalCombinedWinnings.toFixed(2)}</div>
            <div className="text-green-300 text-sm font-bold">💎 TOTAL GOLD</div>
          </div>
        </div>

        {/* Rewards Summary */}
        <div className="dragon-card rounded-xl p-6 dragon-shadow">
          <h3 className="text-2xl font-bold text-amber-300 mb-6 flex items-center space-x-2 dragon-meme-text">
            <Trophy className="h-8 w-8 text-yellow-400 dragon-wing" />
            <span>🏆 DRAGON TREASURE SUMMARY</span>
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center dragon-scale-hover">
              <div className="text-3xl font-bold text-green-400 mb-1 dragon-meme-text">
                {(stats.totalClaimed + stats.fightDragonClaimed).toFixed(4)}
              </div>
              <div className="text-sm text-amber-400 font-bold">💰 GOR CLAIMED</div>
            </div>
            
            <div className="text-center dragon-scale-hover">
              <div className="text-3xl font-bold text-orange-400 mb-1 dragon-meme-text">
                {totalUnclaimed.toFixed(4)}
              </div>
              <div className="text-sm text-amber-400 font-bold">⏳ GOR PENDING</div>
            </div>
            
            <div className="text-center dragon-scale-hover">
              <div className="text-3xl font-bold text-amber-300 mb-1 dragon-meme-text">
                {stats.totalCombinedWinnings.toFixed(4)}
              </div>
              <div className="text-sm text-amber-400 font-bold">🎯 TOTAL WINNINGS</div>
            </div>
          </div>

          {totalUnclaimed > 0 && (
            <div className="mt-6 p-4 dragon-fire-bg rounded-lg text-center dragon-glow">
              <p className="text-black font-bold text-lg dragon-meme-text mb-2">
                🐉 You have {totalUnclaimed.toFixed(4)} GOR in unclaimed dragon treasure!
              </p>
              <a
                href="/history"
                className="bg-black text-amber-300 hover:bg-gray-800 px-6 py-3 rounded-lg font-bold transition-all inline-block dragon-scale-hover"
              >
                🏆 CLAIM DRAGON REWARDS!
              </a>
            </div>
          )}
        </div>

        {/* Achievement Badges */}
        <div className="dragon-card rounded-xl p-6 dragon-shadow">
          <h3 className="text-2xl font-bold text-amber-300 mb-6 flex items-center space-x-2 dragon-meme-text">
            <Star className="h-8 w-8 text-yellow-400 dragon-breath" />
            <span>🏅 DRAGON ACHIEVEMENTS</span>
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* First Win */}
            <div className={`p-4 rounded-lg border text-center dragon-scale-hover transition-all ${
              stats.totalCombinedWins >= 1 
                ? 'dragon-fire-bg border-green-500 dragon-glow' 
                : 'bg-gray-800/50 border-gray-600'
            }`}>
              <Trophy className={`h-10 w-10 mx-auto mb-2 ${
                stats.totalCombinedWins >= 1 ? 'text-black dragon-wing' : 'text-gray-500'
              }`} />
              <div className={`text-sm font-bold dragon-meme-text ${
                stats.totalCombinedWins >= 1 ? 'text-black' : 'text-gray-400'
              }`}>
                🥇 FIRST VICTORY
              </div>
            </div>

            {/* Multi-Game Master */}
            <div className={`p-4 rounded-lg border text-center dragon-scale-hover transition-all ${
              stats.gamesWon >= 1 && stats.fightDragonWins >= 1
                ? 'dragon-fire-bg border-blue-500 dragon-glow' 
                : 'bg-gray-800/50 border-gray-600'
            }`}>
              <Swords className={`h-10 w-10 mx-auto mb-2 ${
                stats.gamesWon >= 1 && stats.fightDragonWins >= 1 ? 'text-black dragon-breath' : 'text-gray-500'
              }`} />
              <div className={`text-sm font-bold dragon-meme-text ${
                stats.gamesWon >= 1 && stats.fightDragonWins >= 1 ? 'text-black' : 'text-gray-400'
              }`}>
                ⚔️ MULTI-GAME MASTER
              </div>
            </div>

            {/* High Roller */}
            <div className={`p-4 rounded-lg border text-center dragon-scale-hover transition-all ${
              stats.totalCombinedWins >= 10 
                ? 'dragon-fire-bg border-purple-500 dragon-glow' 
                : 'bg-gray-800/50 border-gray-600'
            }`}>
              <Award className={`h-10 w-10 mx-auto mb-2 ${
                stats.totalCombinedWins >= 10 ? 'text-black dragon-wing' : 'text-gray-500'
              }`} />
              <div className={`text-sm font-bold dragon-meme-text ${
                stats.totalCombinedWins >= 10 ? 'text-black' : 'text-gray-400'
              }`}>
                🎰 HIGH ROLLER
              </div>
            </div>

            {/* Legend */}
            <div className={`p-4 rounded-lg border text-center dragon-scale-hover transition-all ${
              stats.totalCombinedWins >= 50 
                ? 'dragon-fire-bg border-yellow-500 dragon-glow' 
                : 'bg-gray-800/50 border-gray-600'
            }`}>
              <Crown className={`h-10 w-10 mx-auto mb-2 ${
                stats.totalCombinedWins >= 50 ? 'text-black dragon-breath' : 'text-gray-500'
              }`} />
              <div className={`text-sm font-bold dragon-meme-text ${
                stats.totalCombinedWins >= 50 ? 'text-black' : 'text-gray-400'
              }`}>
                👑 DRAGON LEGEND
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default Profile