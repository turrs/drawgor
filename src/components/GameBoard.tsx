import React, { useState, useEffect } from 'react'
import { Clock, Users, DollarSign, Trophy, Loader2, RefreshCw, AlertTriangle, Flame, Zap } from 'lucide-react'
import { useWallet } from '../contexts/WalletContext'
import { useSystemConfigContext } from '../contexts/SystemConfigContext'
import { useGameState } from '../hooks/useGameState'
import { useNotifications } from '../hooks/useNotifications'
import { createGameTransaction, confirmTransactionWithRetry, checkTransactionStatus } from '../lib/wallet'
import { PublicKey } from '@solana/web3.js'
import NotificationContainer from './NotificationContainer'
import { supabase } from '../lib/supabase'
import WinnerPopup from './WinnerPopup'

// Import dragon images
import dragon1 from '../../assets/Gemini_Generated_Image_phbq79phbq79phbq.png'
import dragon2 from '../../assets/Gemini_Generated_Image_yhrxcyhrxcyhrxcy.png'
import dragon3 from '../../assets/Gemini_Generated_Image_r4kjzzr4kjzzr4kj.png'
import dragon4 from '../../assets/Gemini_Generated_Image_kvcpi2kvcpi2kvcp.png'
import dragon5 from '../../assets/Gemini_Generated_Image_m9gjhqm9gjhqm9gj.png'
import dragon6 from '../../assets/Gemini_Generated_Image_yfiwg2yfiwg2yfiw.png'
import dragon7 from '../../assets/Gemini_Generated_Image_y30gfzy30gfzy30g.png'
import dragon8 from '../../assets/Gemini_Generated_Image_ys3ge8ys3ge8ys3g.png'
import dragon9 from '../../assets/Gemini_Generated_Image_rd0gyird0gyird0g.png'
import dragon10 from '../../assets/Gemini_Generated_Image_gou2higou2higou2.png'

const GameBoard: React.FC = () => {
  const { connected, publicKey, signAndSendTransaction } = useWallet()
  const { config: systemConfig, loading: configLoading, error: configError } = useSystemConfigContext()
  const { currentLobby, players, loading, timeLeft, joinLobby, refetch } = useGameState()
  const { notifications, removeNotification, showSuccess, showError, showInfo } = useNotifications()
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showWinnerPopup, setShowWinnerPopup] = useState(false)
  const [winnerData, setWinnerData] = useState<{
    winningNumber: number
    isWinner: boolean
    prizeAmount: number
    totalWinners: number
  } | null>(null)

  // Dragon image mapping for each number
  const getDragonImage = (number: number) => {
    const dragonImages = {
      1: dragon1,
      2: dragon2,
      3: dragon3,
      4: dragon4,
      5: dragon5,
      6: dragon6,
      7: dragon7,
      8: dragon8,
      9: dragon9,
      10: dragon10
    }
    return dragonImages[number as keyof typeof dragonImages] || dragon1
  }

  // Dragon names mapping
  const getDragonName = (number: number) => {
    const dragonNames = {
      1: 'IGNIS',
      2: 'SERAPHINA',
      3: 'DRAKON',
      4: 'WYRMWOOD',
      5: 'AETHERION',
      6: 'OBSIDIUS',
      7: 'VERIDIAN',
      8: 'SOLARA',
      9: 'UMBRION',
      10: 'QUETZALCOATL'
    }
    return dragonNames[number as keyof typeof dragonNames] || 'DRAGON'
  }

  // Dragon character mapping for fallback/emoji use
  const getDragonCharacter = (number: number) => {
    const dragonChars = {
      1: '🔥', // Ignis - Fire
      2: '✨', // Seraphina - Celestial
      3: '🐲', // Drakon - Classic Dragon
      4: '🌲', // Wyrmwood - Nature
      5: '⚡', // Aetherion - Lightning
      6: '🖤', // Obsidius - Dark
      7: '🌿', // Veridian - Green
      8: '☀️', // Solara - Sun
      9: '🌙', // Umbrion - Shadow
      10: '👑' // Quetzalcoatl - King
    }
    return dragonChars[number as keyof typeof dragonChars] || '🐲'
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleNumberSelect = (number: number) => {
    if (currentLobby?.status !== 'active' && currentLobby?.status !== 'waiting') return
    if (players.some(p => p.wallet_address === publicKey?.toString())) return
    setSelectedNumber(number)
  }

  const handleSubmitNumber = async () => {
    if (!connected || !publicKey || !selectedNumber || !currentLobby) {
      showError('Connection Required', 'Please connect wallet and select a number')
      return
    }

    if (!systemConfig) {
      showError('Configuration Error', 'System configuration not loaded. Please try again.')
      return
    }

    // Check if player already joined this lobby
    if (players.some(p => p.wallet_address === publicKey.toString())) {
      showError('Already Joined', 'You have already joined this lobby')
      return
    }

    try {
      setSubmitting(true)
      console.log('Starting game join process...')

      if (!systemConfig.central_wallet_address || systemConfig.central_wallet_address.trim() === '') {
        throw new Error('Central wallet not configured. Please contact admin to set up the wallet address.')
      }

      let centralWalletAddress: PublicKey
      try {
        centralWalletAddress = new PublicKey(systemConfig.central_wallet_address)
      } catch (e) {
        throw new Error('Invalid central wallet address configured. Please contact admin.')
      }

      const entryFee = systemConfig.entry_fee || 0.1

      console.log('Creating transaction...', {
        from: publicKey.toString(),
        to: centralWalletAddress.toString(),
        amount: entryFee,
        gameId: currentLobby.id,
        selectedNumber: selectedNumber
      })

      showInfo('🐉 Dragon Magic', 'Summoning transaction spell...')

      // Create transaction
      const transaction = await createGameTransaction(
        publicKey,
        centralWalletAddress,
        entryFee,
        currentLobby.id,
        selectedNumber
      )

      console.log('Transaction created, requesting signature...')
      showInfo('🔥 Dragon Seal', 'Sign with your dragon power!')

      // Sign and send transaction
      const signature = await signAndSendTransaction(transaction)
      console.log('Transaction sent, signature:', signature)
      
      showInfo('⚡ Dragon Strike', 'Transaction sent, awaiting dragon confirmation...')

      // Enhanced confirmation process
      console.log('Confirming transaction...')
      let confirmed = false
      let attempts = 0
      const maxAttempts = 15 // 15 attempts over ~30 seconds
      
      while (!confirmed && attempts < maxAttempts) {
        attempts++
        console.log(`Confirmation attempt ${attempts}/${maxAttempts}`)
        
        // Check transaction status
        confirmed = await checkTransactionStatus(signature)
        
        if (confirmed) {
          console.log('Transaction confirmed successfully!')
          break
        }
        
        // Wait 2 seconds before next check
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
      
      if (!confirmed) {
        // Last attempt with detailed confirmation
        console.log('Final confirmation attempt...')
        confirmed = await confirmTransactionWithRetry(signature, 3)
      }
      
      if (confirmed) {
        console.log('Transaction confirmed, joining lobby in database...')
        showInfo('🐲 Dragon Blessing', 'Transaction confirmed, entering the dragon\'s lair...')
        
        // Join lobby in database
        const result = await joinLobby(publicKey.toString(), selectedNumber, signature)
        
        if (result) {
          showSuccess('🎉 DRAGON POWER!', `Successfully joined with ${getDragonName(selectedNumber)}. May the dragon's luck be with you! 🐉🔥`)
          setSelectedNumber(null)
          // Refresh game state to show updated player list
          await refetch()
        } else {
          throw new Error('Failed to join lobby in database')
        }
      } else {
        throw new Error('Transaction confirmation timeout. Please check the blockchain explorer to verify your transaction.')
      }
      
    } catch (error) {
      console.error('Failed to join game:', error)
      showError('🐉 Dragon Rejected', error.message)
    } finally {
      setSubmitting(false)
    }
  }

  // Check for completed lobby and show winner popup
  useEffect(() => {
    if (currentLobby?.status === 'completed' && currentLobby.result_number && publicKey) {
      const userPlayer = players.find(p => p.wallet_address === publicKey.toString())
      if (userPlayer) {
        const winners = players.filter(p => p.is_winner)
        setWinnerData({
          winningNumber: currentLobby.result_number,
          isWinner: userPlayer.is_winner,
          prizeAmount: userPlayer.prize_amount || 0,
          totalWinners: winners.length
        })
        setShowWinnerPopup(true)
      }
    }
  }, [currentLobby, players, publicKey])

  // Auto-trigger scheduler every 10 seconds to ensure continuous lobby availability
  useEffect(() => {
    const triggerScheduler = async () => {
      try {
        console.log('🔄 Auto-triggering lobby scheduler...')
        
        // Use Supabase client to invoke the edge function
        const { data, error } = await supabase.functions.invoke('lobby-scheduler', {
          body: {},
        })

        if (error) {
          console.error('❌ Scheduler failed:', error)
          return
        }

        console.log('📊 Scheduler result:', data)
        
        if (data?.success) {
          // Only show notification if a new lobby was created
          if (data.stats?.createdNewLobby) {
            showInfo('🐉 New Dragon Lair', 'A new dragon lair has been summoned!')
          }
          
          // Refresh the game state to show latest lobby
          await refetch()
        } else {
          console.error('❌ Scheduler failed:', data?.error)
        }
      } catch (error) {
        console.error('❌ Failed to trigger scheduler:', error)
      }
    }

    // Initial trigger when component mounts
    if (systemConfig && !loading) {
      triggerScheduler()
    }

    // Set up periodic scheduler trigger every 10 seconds
    const interval = setInterval(() => {
      if (systemConfig && !loading) {
        triggerScheduler()
      }
    }, 10000) // Every 10 seconds

    return () => clearInterval(interval)
  }, [systemConfig, loading])

  // Show loading state while system config is loading
  if (configLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="dragon-card rounded-2xl p-8 text-center dragon-glow">
          <Flame className="h-12 w-12 text-orange-500 mx-auto mb-4 dragon-breath" />
          <span className="text-amber-300 font-bold dragon-meme-text text-xl">
            {configLoading ? '🐉 AWAKENING DRAGON...' : '🔥 SUMMONING GAME...'}
          </span>
        </div>
      </div>
    )
  }

  // Show configuration error if present
  if (configError || !systemConfig) {
    return (
      <div className="text-center py-20">
        <div className="dragon-card rounded-2xl p-8 max-w-md mx-auto dragon-shadow">
          <AlertTriangle className="h-16 w-16 text-red-400 mx-auto mb-4 dragon-breath" />
          <h2 className="text-2xl font-bold text-amber-300 mb-2 dragon-meme-text">🐉 DRAGON ERROR!</h2>
          <p className="text-red-400 mb-6">
            {configError || 'Dragon configuration could not be loaded'}
          </p>
          <div className="bg-red-900/20 border border-red-700 rounded-xl p-6">
            <h3 className="text-lg font-bold text-amber-300 mb-2 dragon-meme-text">ADMIN SETUP REQUIRED</h3>
            <p className="text-amber-400 text-sm mb-4">
              To awaken the dragon, an administrator needs to:
            </p>
            <ol className="text-left text-amber-400 text-sm space-y-1 mb-4">
              <li>1. Go to <code className="bg-gray-800 px-1 rounded">/admin/login</code></li>
              <li>2. Login with admin credentials</li>
              <li>3. Configure the dragon's wallet address</li>
              <li>4. Save the configuration</li>
            </ol>
            <a 
              href="/admin/login" 
              className="dragon-button px-4 py-2 rounded-lg font-bold transition-all inline-block dragon-scale-hover"
            >
              🐉 AWAKEN ADMIN PANEL
            </a>
          </div>
        </div>
      </div>
    )
  }

  // Check if central wallet is configured
  if (!systemConfig.central_wallet_address || systemConfig.central_wallet_address.trim() === '') {
    return (
      <div className="text-center py-20">
        <div className="dragon-card rounded-2xl p-8 max-w-md mx-auto dragon-shadow">
          <AlertTriangle className="h-16 w-16 text-yellow-400 mx-auto mb-4 dragon-breath" />
          <h2 className="text-2xl font-bold text-amber-300 mb-2 dragon-meme-text">🐉 SETUP REQUIRED</h2>
          <p className="text-yellow-400 mb-6">
            Dragon wallet address not configured. Please contact admin to set up the dragon's lair.
          </p>
          <a 
            href="/admin/login" 
            className="dragon-button px-4 py-2 rounded-lg font-bold transition-all inline-block dragon-scale-hover"
          >
            🐉 AWAKEN ADMIN PANEL
          </a>
        </div>
      </div>
    )
  }

  // Validate wallet address format
  try {
    new PublicKey(systemConfig.central_wallet_address)
  } catch (e) {
    return (
      <div className="text-center py-20">
        <div className="dragon-card rounded-2xl p-8 max-w-md mx-auto dragon-shadow">
          <AlertTriangle className="h-16 w-16 text-red-400 mx-auto mb-4 dragon-breath" />
          <h2 className="text-2xl font-bold text-amber-300 mb-2 dragon-meme-text">🐉 INVALID DRAGON!</h2>
          <p className="text-red-400 mb-6">
            Invalid dragon wallet address configured. Please contact admin.
          </p>
          <a 
            href="/admin/login" 
            className="dragon-button px-4 py-2 rounded-lg font-bold transition-all inline-block dragon-scale-hover"
          >
            🐉 AWAKEN ADMIN PANEL
          </a>
        </div>
      </div>
    )
  }

  if (!currentLobby) {
    return (
      <>
        <NotificationContainer notifications={notifications} onClose={removeNotification} />
        <div className="text-center py-20">
          <div className="dragon-card rounded-2xl p-8 max-w-md mx-auto dragon-glow">
            <Clock className="h-16 w-16 text-amber-400 mx-auto mb-4 dragon-breath" />
            <h2 className="text-2xl font-bold text-amber-300 mb-2 dragon-meme-text">🐉 SUMMONING DRAGON...</h2>
            <p className="text-amber-400 mb-6 font-semibold">
              Preparing your dragon lair...
            </p>
            <div className="flex items-center justify-center">
              <Flame className="h-6 w-6 text-orange-500 mr-2 dragon-wing" />
              <span className="text-amber-300 font-bold">Creating dragon lobby...</span>
            </div>
          </div>
        </div>
      </>
    )
  }

  const userPlayer = players.find(p => p.wallet_address === publicKey?.toString())
  const hasJoined = !!userPlayer

  return (
    <>
      <NotificationContainer notifications={notifications} onClose={removeNotification} />
      <WinnerPopup 
        isOpen={showWinnerPopup}
        onClose={() => setShowWinnerPopup(false)}
        winnerData={winnerData}
      />
      <div className="space-y-8">
        {/* Game Status */}
        <div className="dragon-card rounded-xl p-6 dragon-shadow">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center dragon-scale-hover">
              <Clock className="h-8 w-8 text-blue-400 mx-auto mb-2 dragon-breath" />
              <div className="text-2xl font-bold text-amber-300 dragon-meme-text">{formatTime(timeLeft)}</div>
              <div className="text-sm text-amber-500 font-semibold">
                {currentLobby.status === 'waiting' ? '🐉 AWAKENING' : 
                 currentLobby.status === 'active' ? '🔥 DRAGON ACTIVE' : '✨ COMPLETED'}
              </div>
            </div>
            
            <div className="text-center dragon-scale-hover">
              <Users className="h-8 w-8 text-green-400 mx-auto mb-2 dragon-breath" />
              <div className="text-2xl font-bold text-amber-300 dragon-meme-text">{players.length}</div>
              <div className="text-sm text-amber-500 font-semibold">🐲 WARRIORS</div>
            </div>
            
            <div className="text-center dragon-scale-hover">
              <DollarSign className="h-8 w-8 text-yellow-400 mx-auto mb-2 dragon-breath" />
              <div className="text-2xl font-bold text-amber-300 dragon-meme-text">{(players.length * (systemConfig.entry_fee || 0.1)).toFixed(1)}</div>
              <div className="text-sm text-amber-500 font-semibold">💎 DRAGON GOLD</div>
            </div>
            
            <div className="text-center dragon-scale-hover">
              <Trophy className="h-8 w-8 text-purple-400 mx-auto mb-2 dragon-breath" />
              <div className="text-2xl font-bold text-amber-300 dragon-meme-text">
                {currentLobby.result_number ? (
                  <img 
                    src={getDragonImage(currentLobby.result_number)} 
                    alt={getDragonName(currentLobby.result_number)}
                    className="w-8 h-8 mx-auto object-contain"
                  />
                ) : '🐉'}
              </div>
              <div className="text-sm text-amber-500 font-semibold">🏆 DRAGON NUMBER</div>
            </div>
          </div>
        </div>

        {/* Game Status Banner */}
        <div className="text-center">
          <div className={`inline-flex items-center px-6 py-3 rounded-full text-lg font-bold dragon-meme-text dragon-scale-hover ${
            currentLobby.status === 'waiting' ? 'bg-blue-900/30 text-blue-300 border border-blue-500' :
            currentLobby.status === 'active' ? 'bg-green-900/30 text-green-300 border border-green-500 dragon-glow' :
            'bg-purple-900/30 text-purple-300 border border-purple-500'
          }`}>
            <div className={`w-3 h-3 rounded-full mr-3 dragon-breath ${
              currentLobby.status === 'waiting' ? 'bg-blue-400' :
              currentLobby.status === 'active' ? 'bg-green-400' :
              'bg-purple-400'
            }`}></div>
            {currentLobby.status === 'waiting' && `🐉 DRAGON AWAKENS IN ${formatTime(timeLeft)}`}
            {currentLobby.status === 'active' && '🔥 DRAGON BATTLE IN PROGRESS!'}
            {currentLobby.status === 'completed' && '✨ DRAGON BATTLE COMPLETED!'}
          </div>
        </div>

        {/* Number Selection */}
        {!hasJoined && (currentLobby.status === 'active' || currentLobby.status === 'waiting') && connected && (
          <div className="dragon-card rounded-xl p-6 dragon-shadow">
            <h3 className="text-2xl font-bold text-amber-300 mb-6 text-center dragon-meme-text">
              🐲 CHOOSE YOUR DRAGON GUARDIAN 🐲
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((number) => {
                const isSelected = selectedNumber === number
                const isTaken = players.some(p => p.selected_number === number)
                const dragonImage = getDragonImage(number)
                const dragonName = getDragonName(number)
                
                return (
                  <button
                    key={number}
                    onClick={() => handleNumberSelect(number)}
                    className={`relative p-4 rounded-xl font-bold transition-all duration-300 dragon-scale-hover border-2 ${
                      isSelected
                        ? 'dragon-fire-bg border-yellow-400 dragon-glow transform scale-105'
                        : isTaken
                        ? 'bg-gray-700/50 text-gray-400 cursor-not-allowed border-gray-600 opacity-50'
                        : 'dragon-card border-amber-500/50 hover:border-amber-400 hover:bg-orange-900/30'
                    }`}
                    disabled={isTaken}
                  >
                    <div className="flex flex-col items-center space-y-2">
                      <div className={`${isSelected ? 'animate-bounce' : ''}`}>
                        <img 
                          src={dragonImage} 
                          alt={dragonName}
                          className="w-16 h-16 object-contain mx-auto"
                        />
                      </div>
                      <div className={`text-lg font-bold dragon-meme-text ${
                        isSelected ? 'text-black' : isTaken ? 'text-gray-400' : 'text-amber-300'
                      }`}>
                        {number}
                      </div>
                      <div className={`text-xs font-bold ${
                        isSelected ? 'text-black' : isTaken ? 'text-gray-500' : 'text-amber-400'
                      }`}>
                        {dragonName}
                      </div>
                    </div>
                    
                    {isTaken && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-xl">
                        <span className="text-red-400 font-bold text-sm dragon-meme-text">TAKEN</span>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
            
            {selectedNumber && (
              <div className="text-center">
                <div className="dragon-card rounded-lg p-4 mb-4 dragon-glow border border-amber-500">
                  <div className="flex items-center justify-center space-x-3 mb-2">
                    <img 
                      src={getDragonImage(selectedNumber)} 
                      alt={getDragonName(selectedNumber)}
                      className="w-16 h-16 object-contain animate-pulse"
                    />
                    <div>
                      <p className="text-amber-300 mb-1 font-bold dragon-meme-text">
                        🐉 SELECTED: {getDragonName(selectedNumber)}
                      </p>
                      <p className="text-amber-400 font-semibold text-sm">
                        Number {selectedNumber} • {getDragonName(selectedNumber)}
                      </p>
                    </div>
                  </div>
                  <p className="text-amber-400 font-semibold">
                    🔥 Entry fee: <span className="font-bold text-yellow-400">{systemConfig.entry_fee || 0.1} GOR</span>
                  </p>
                </div>
                <button
                  onClick={handleSubmitNumber}
                  disabled={submitting}
                  className="dragon-button px-8 py-4 rounded-lg font-bold text-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center mx-auto dragon-scale-hover"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      🐉 SUMMONING...
                    </>
                  ) : (
                    <>
                      <img 
                        src={getDragonImage(selectedNumber)} 
                        alt={getDragonName(selectedNumber)}
                        className="w-6 h-6 object-contain mr-2"
                      />
                      🔥 UNLEASH {getDragonName(selectedNumber)}!
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* User's Selection */}
        {hasJoined && (
          <div className="dragon-card rounded-xl p-6 text-center dragon-glow border border-green-500">
            <div className="flex items-center justify-center space-x-4 mb-4">
              <img 
                src={getDragonImage(userPlayer.selected_number)} 
                alt={getDragonName(userPlayer.selected_number)}
                className="w-24 h-24 object-contain dragon-wing"
              />
              <Trophy className="h-16 w-16 text-green-400 dragon-breath" />
            </div>
            <h3 className="text-2xl font-bold text-amber-300 mb-2 dragon-meme-text">🐉 YOU'RE IN THE LAIR!</h3>
            <p className="text-green-300 font-bold text-xl mb-2">
              Your dragon guardian: <span className="font-bold text-2xl text-amber-100 dragon-epic">{getDragonName(userPlayer.selected_number)}</span>
            </p>
            <p className="text-green-400 font-semibold">
              Number {userPlayer.selected_number} • {getDragonName(userPlayer.selected_number)}
            </p>
            {userPlayer.is_winner && (
              <div className="mt-4 p-4 dragon-winner rounded-lg">
                <p className="text-black font-bold text-2xl dragon-meme-text">
                  🎉 DRAGON CHAMPION! 🐉 Prize: {userPlayer.prize_amount} GOR 💎
                </p>
              </div>
            )}
          </div>
        )}

        {/* Connect Wallet Prompt */}
        {!connected && (
          <div className="dragon-card rounded-xl p-6 text-center dragon-shadow">
            <Flame className="h-16 w-16 text-orange-500 mx-auto mb-4 dragon-breath" />
            <h3 className="text-2xl font-bold text-amber-300 mb-2 dragon-meme-text">🐉 CONNECT YOUR DRAGON WALLET</h3>
            <p className="text-amber-400 font-semibold">Connect your Backpack wallet to enter the dragon's lair</p>
          </div>
        )}

        {/* Current Players */}
        {players.length > 0 && (
          <div className="dragon-card rounded-xl p-6 dragon-shadow">
            <h3 className="text-xl font-bold text-amber-300 mb-4 dragon-meme-text flex items-center">
              <Users className="h-6 w-6 mr-2 dragon-breath" />
              🐲 DRAGON WARRIORS ({players.length})
            </h3>
            <div className="grid gap-3 max-h-64 overflow-y-auto">
              {players.map((player) => (
                <div
                  key={player.id}
                  className={`flex items-center justify-between p-4 rounded-lg transition-all dragon-scale-hover ${
                    player.is_winner ? 'dragon-winner border border-amber-500' : 'bg-gray-800/50 border border-amber-500/30'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg dragon-scale-hover border-2 ${
                      player.is_winner ? 'dragon-winner text-black border-yellow-400' : 'dragon-card border-amber-500/50'
                    }`}>
                      <img 
                        src={getDragonImage(player.selected_number)} 
                        alt={getDragonName(player.selected_number)}
                        className="w-8 h-8 object-contain"
                      />
                    </div>
                    <div>
                      <span className="font-mono text-sm text-amber-300 font-semibold block">
                        {player.wallet_address.slice(0, 8)}...{player.wallet_address.slice(-8)}
                      </span>
                      <span className="text-xs text-amber-400 font-semibold">
                        {getDragonName(player.selected_number)}
                      </span>
                    </div>
                  </div>
                  {player.is_winner && (
                    <div className="flex items-center text-black font-bold">
                      <Trophy className="h-5 w-5 mr-1" />
                      <span className="text-lg dragon-meme-text">{player.prize_amount} GOR</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default GameBoard