import React, { useState, useEffect } from 'react'
import { Clock, Users, DollarSign, Trophy, Loader2, RefreshCw, AlertTriangle, Swords, Shield, Zap } from 'lucide-react'
import { useWallet } from '../contexts/WalletContext'
import { useSystemConfigContext } from '../contexts/SystemConfigContext'
import { useFightDragonGameState } from '../hooks/useFightDragonGameState'
import { useNotifications } from '../hooks/useNotifications'
import { createGameTransaction, confirmTransactionWithRetry, checkTransactionStatus } from '../lib/wallet'
import { PublicKey } from '@solana/web3.js'
import NotificationContainer from './NotificationContainer'
import { supabase } from '../lib/supabase'
import FightDragonWinnerPopup from './FightDragonWinnerPopup'

const FightDragonGame: React.FC = () => {
  const { connected, publicKey, signAndSendTransaction } = useWallet()
  const { config: systemConfig, loading: configLoading, error: configError } = useSystemConfigContext()
  const { currentBattle, fighters, loading, timeLeft, joinBattle, refetch } = useFightDragonGameState()
  const { notifications, removeNotification, showSuccess, showError, showInfo } = useNotifications()
  const [selectedSide, setSelectedSide] = useState<number | null>(null) // 1 for Dragon, 10 for Knight
  const [submitting, setSubmitting] = useState(false)
  const [showWinnerPopup, setShowWinnerPopup] = useState(false)
  const [winnerData, setWinnerData] = useState<{
    winningNumber: number
    isWinner: boolean
    prizeAmount: number
    totalWinners: number
  } | null>(null)

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleSideSelect = (side: number) => {
    if (currentBattle?.status !== 'active' && currentBattle?.status !== 'waiting') return
    if (fighters.some(f => f.wallet_address === publicKey?.toString())) return
    setSelectedSide(side)
  }

  const handleSubmitChoice = async () => {
    if (!connected || !publicKey || !selectedSide || !currentBattle) {
      showError('Connection Required', 'Please connect wallet and choose your side')
      return
    }

    if (!systemConfig) {
      showError('Configuration Error', 'System configuration not loaded. Please try again.')
      return
    }

    // Check if player already joined this battle
    if (fighters.some(f => f.wallet_address === publicKey.toString())) {
      showError('Already Joined', 'You have already joined this battle')
      return
    }

    try {
      setSubmitting(true)
      console.log('Starting fight dragon battle join process...')

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
        battleId: currentBattle.id,
        selectedSide: selectedSide
      })

      showInfo('⚔️ Dragon Battle', 'Summoning battle transaction...')

      // Create transaction
      const transaction = await createGameTransaction(
        publicKey,
        centralWalletAddress,
        entryFee,
        currentBattle.id,
        selectedSide
      )

      console.log('Transaction created, requesting signature...')
      showInfo('🛡️ Battle Seal', 'Sign with your warrior power!')

      // Sign and send transaction
      const signature = await signAndSendTransaction(transaction)
      console.log('Transaction sent, signature:', signature)
      
      showInfo('⚡ Battle Strike', 'Transaction sent, awaiting battle confirmation...')

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
        console.log('Transaction confirmed, joining battle in database...')
        showInfo('⚔️ Dragon Battle', 'Transaction confirmed, entering the battle arena...')
        
        // Join battle in database
        const result = await joinBattle(publicKey.toString(), selectedSide, signature)
        
        if (result) {
          const sideText = selectedSide === 1 ? 'Dragon' : 'Knight'
          showSuccess('🎉 BATTLE JOINED!', `Successfully joined as ${sideText}. May victory be yours! ⚔️🔥`)
          setSelectedSide(null)
          // Refresh game state to show updated fighter list
          await refetch()
        } else {
          throw new Error('Failed to join battle in database')
        }
      } else {
        throw new Error('Transaction confirmation timeout. Please check the blockchain explorer to verify your transaction.')
      }
      
    } catch (error) {
      console.error('Failed to join battle:', error)
      showError('⚔️ Battle Rejected', error.message)
    } finally {
      setSubmitting(false)
    }
  }

  // Check for completed battle and show winner popup
  useEffect(() => {
    if (currentBattle?.status === 'completed' && currentBattle.result_number && publicKey) {
      const userFighter = fighters.find(f => f.wallet_address === publicKey.toString())
      if (userFighter) {
        const winners = fighters.filter(f => f.is_winner)
        setWinnerData({
          winningNumber: currentBattle.result_number,
          isWinner: userFighter.is_winner,
          prizeAmount: userFighter.prize_amount || 0,
          totalWinners: winners.length
        })
        setShowWinnerPopup(true)
      }
    }
  }, [currentBattle, fighters, publicKey])

  // Auto-trigger scheduler every 10 seconds to ensure continuous battle availability
  useEffect(() => {
    const triggerScheduler = async () => {
      try {
        console.log('🔄 Auto-triggering fight dragon scheduler...')
        
        // Use Supabase client to invoke the edge function
        const { data, error } = await supabase.functions.invoke('fight-dragon-scheduler', {
          body: {},
        })

        if (error) {
          console.error('❌ Fight Dragon Scheduler failed:', error)
          return
        }

        console.log('📊 Fight Dragon Scheduler result:', data)
        
        if (data?.success) {
          // Only show notification if a new battle was created
          if (data.stats?.createdNewBattle) {
            showInfo('⚔️ New Battle Arena', 'A new dragon battle has been summoned!')
          }
          
          // Refresh the game state to show latest battle
          await refetch()
        } else {
          console.error('❌ Fight Dragon Scheduler failed:', data?.error)
        }
      } catch (error) {
        console.error('❌ Failed to trigger fight dragon scheduler:', error)
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
          <Swords className="h-12 w-12 text-red-500 mx-auto mb-4 dragon-breath" />
          <span className="text-amber-300 font-bold dragon-meme-text text-xl">
            {configLoading ? '⚔️ AWAKENING BATTLE...' : '🔥 SUMMONING ARENA...'}
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
          <h2 className="text-2xl font-bold text-amber-300 mb-2 dragon-meme-text">⚔️ BATTLE ERROR!</h2>
          <p className="text-red-400 mb-6">
            {configError || 'Battle configuration could not be loaded'}
          </p>
          <div className="bg-red-900/20 border border-red-700 rounded-xl p-6">
            <h3 className="text-lg font-bold text-amber-300 mb-2 dragon-meme-text">ADMIN SETUP REQUIRED</h3>
            <p className="text-amber-400 text-sm mb-4">
              To start the battle, an administrator needs to:
            </p>
            <ol className="text-left text-amber-400 text-sm space-y-1 mb-4">
              <li>1. Go to <code className="bg-gray-800 px-1 rounded">/admin/login</code></li>
              <li>2. Login with admin credentials</li>
              <li>3. Configure the battle wallet address</li>
              <li>4. Save the configuration</li>
            </ol>
            <a 
              href="/admin/login" 
              className="dragon-button px-4 py-2 rounded-lg font-bold transition-all inline-block dragon-scale-hover"
            >
              ⚔️ AWAKEN ADMIN PANEL
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
          <h2 className="text-2xl font-bold text-amber-300 mb-2 dragon-meme-text">⚔️ SETUP REQUIRED</h2>
          <p className="text-yellow-400 mb-6">
            Battle wallet address not configured. Please contact admin to set up the battle arena.
          </p>
          <a 
            href="/admin/login" 
            className="dragon-button px-4 py-2 rounded-lg font-bold transition-all inline-block dragon-scale-hover"
          >
            ⚔️ AWAKEN ADMIN PANEL
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
          <h2 className="text-2xl font-bold text-amber-300 mb-2 dragon-meme-text">⚔️ INVALID BATTLE!</h2>
          <p className="text-red-400 mb-6">
            Invalid battle wallet address configured. Please contact admin.
          </p>
          <a 
            href="/admin/login" 
            className="dragon-button px-4 py-2 rounded-lg font-bold transition-all inline-block dragon-scale-hover"
          >
            ⚔️ AWAKEN ADMIN PANEL
          </a>
        </div>
      </div>
    )
  }

  if (!currentBattle) {
    return (
      <>
        <NotificationContainer notifications={notifications} onClose={removeNotification} />
        <div className="text-center py-20">
          <div className="dragon-card rounded-2xl p-8 max-w-md mx-auto dragon-glow">
            <Clock className="h-16 w-16 text-amber-400 mx-auto mb-4 dragon-breath" />
            <h2 className="text-2xl font-bold text-amber-300 mb-2 dragon-meme-text">⚔️ SUMMONING BATTLE...</h2>
            <p className="text-amber-400 mb-6 font-semibold">
              Preparing your battle arena...
            </p>
            <div className="flex items-center justify-center">
              <Swords className="h-6 w-6 text-red-500 mr-2 dragon-wing" />
              <span className="text-amber-300 font-bold">Creating battle arena...</span>
            </div>
          </div>
        </div>
      </>
    )
  }

  const userFighter = fighters.find(f => f.wallet_address === publicKey?.toString())
  const hasJoined = !!userFighter

  const dragonFighters = fighters.filter(f => f.selected_number === 1)
  const knightFighters = fighters.filter(f => f.selected_number === 10)

  return (
    <>
      <NotificationContainer notifications={notifications} onClose={removeNotification} />
      <FightDragonWinnerPopup 
        isOpen={showWinnerPopup}
        onClose={() => setShowWinnerPopup(false)}
        winnerData={winnerData}
      />
      <div className="space-y-8">
        {/* Battle Status */}
        <div className="dragon-card rounded-xl p-6 dragon-shadow">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center dragon-scale-hover">
              <Clock className="h-8 w-8 text-blue-400 mx-auto mb-2 dragon-breath" />
              <div className="text-2xl font-bold text-amber-300 dragon-meme-text">{formatTime(timeLeft)}</div>
              <div className="text-sm text-amber-500 font-semibold">
                {currentBattle.status === 'waiting' ? '⚔️ PREPARING' : 
                 currentBattle.status === 'active' ? '🔥 BATTLE ACTIVE' : '✨ COMPLETED'}
              </div>
            </div>
            
            <div className="text-center dragon-scale-hover">
              <Users className="h-8 w-8 text-green-400 mx-auto mb-2 dragon-breath" />
              <div className="text-2xl font-bold text-amber-300 dragon-meme-text">{fighters.length}</div>
              <div className="text-sm text-amber-500 font-semibold">⚔️ FIGHTERS</div>
            </div>
            
            <div className="text-center dragon-scale-hover">
              <DollarSign className="h-8 w-8 text-yellow-400 mx-auto mb-2 dragon-breath" />
              <div className="text-2xl font-bold text-amber-300 dragon-meme-text">{(fighters.length * (systemConfig.entry_fee || 0.1)).toFixed(1)}</div>
              <div className="text-sm text-amber-500 font-semibold">💎 BATTLE GOLD</div>
            </div>
            
            <div className="text-center dragon-scale-hover">
              <Trophy className="h-8 w-8 text-purple-400 mx-auto mb-2 dragon-breath" />
              <div className="text-2xl font-bold text-amber-300 dragon-meme-text">
                {currentBattle.result_number ? (currentBattle.result_number === 1 ? '🐉' : '🛡️') : '⚔️'}
              </div>
              <div className="text-sm text-amber-500 font-semibold">🏆 VICTOR</div>
            </div>
          </div>
        </div>

        {/* Battle Status Banner */}
        <div className="text-center">
          <div className={`inline-flex items-center px-6 py-3 rounded-full text-lg font-bold dragon-meme-text dragon-scale-hover ${
            currentBattle.status === 'waiting' ? 'bg-blue-900/30 text-blue-300 border border-blue-500' :
            currentBattle.status === 'active' ? 'bg-red-900/30 text-red-300 border border-red-500 dragon-glow' :
            'bg-purple-900/30 text-purple-300 border border-purple-500'
          }`}>
            <div className={`w-3 h-3 rounded-full mr-3 dragon-breath ${
              currentBattle.status === 'waiting' ? 'bg-blue-400' :
              currentBattle.status === 'active' ? 'bg-red-400' :
              'bg-purple-400'
            }`}></div>
            {currentBattle.status === 'waiting' && `⚔️ BATTLE BEGINS IN ${formatTime(timeLeft)}`}
            {currentBattle.status === 'active' && '🔥 EPIC BATTLE IN PROGRESS!'}
            {currentBattle.status === 'completed' && '✨ BATTLE COMPLETED!'}
          </div>
        </div>

        {/* Side Selection */}
        {!hasJoined && (currentBattle.status === 'active' || currentBattle.status === 'waiting') && connected && (
          <div className="dragon-card rounded-xl p-6 dragon-shadow">
            <h3 className="text-2xl font-bold text-amber-300 mb-6 text-center dragon-meme-text">
              ⚔️ CHOOSE YOUR SIDE ⚔️
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Dragon Side */}
              <button
                onClick={() => handleSideSelect(1)}
                className={`relative p-8 rounded-xl font-bold transition-all duration-300 dragon-scale-hover border-2 ${
                  selectedSide === 1
                    ? 'dragon-fire-bg border-red-400 dragon-glow transform scale-105'
                    : 'dragon-card border-red-500/50 hover:border-red-400 hover:bg-red-900/30'
                }`}
              >
                <div className="flex flex-col items-center space-y-4">
                  <div className={`text-6xl ${selectedSide === 1 ? 'animate-bounce' : ''}`}>
                    🐉
                  </div>
                  <div className={`text-2xl font-bold dragon-meme-text ${
                    selectedSide === 1 ? 'text-black' : 'text-red-300'
                  }`}>
                    DRAGON
                  </div>
                  <div className={`text-sm font-bold ${
                    selectedSide === 1 ? 'text-black' : 'text-red-400'
                  }`}>
                    Number: 1
                  </div>
                  <div className={`text-xs text-center ${
                    selectedSide === 1 ? 'text-black/80' : 'text-red-500'
                  }`}>
                    {dragonFighters.length} fighter{dragonFighters.length !== 1 ? 's' : ''}
                  </div>
                </div>
              </button>

              {/* Knight Side */}
              <button
                onClick={() => handleSideSelect(10)}
                className={`relative p-8 rounded-xl font-bold transition-all duration-300 dragon-scale-hover border-2 ${
                  selectedSide === 10
                    ? 'dragon-fire-bg border-blue-400 dragon-glow transform scale-105'
                    : 'dragon-card border-blue-500/50 hover:border-blue-400 hover:bg-blue-900/30'
                }`}
              >
                <div className="flex flex-col items-center space-y-4">
                  <div className={`text-6xl ${selectedSide === 10 ? 'animate-bounce' : ''}`}>
                    🛡️
                  </div>
                  <div className={`text-2xl font-bold dragon-meme-text ${
                    selectedSide === 10 ? 'text-black' : 'text-blue-300'
                  }`}>
                    KNIGHT
                  </div>
                  <div className={`text-sm font-bold ${
                    selectedSide === 10 ? 'text-black' : 'text-blue-400'
                  }`}>
                    Number: 10
                  </div>
                  <div className={`text-xs text-center ${
                    selectedSide === 10 ? 'text-black/80' : 'text-blue-500'
                  }`}>
                    {knightFighters.length} fighter{knightFighters.length !== 1 ? 's' : ''}
                  </div>
                </div>
              </button>
            </div>
            
            {selectedSide && (
              <div className="text-center">
                <div className="dragon-card rounded-lg p-4 mb-4 dragon-glow border border-amber-500">
                  <div className="flex items-center justify-center space-x-3 mb-2">
                    <div className="text-4xl">
                      {selectedSide === 1 ? '🐉' : '🛡️'}
                    </div>
                    <div>
                      <p className="text-amber-300 mb-1 font-bold dragon-meme-text">
                        ⚔️ SELECTED: {selectedSide === 1 ? 'DRAGON' : 'KNIGHT'}
                      </p>
                      <p className="text-amber-400 font-semibold text-sm">
                        Side {selectedSide === 1 ? '1 - Dragon' : '10 - Knight'}
                      </p>
                    </div>
                  </div>
                  <p className="text-amber-400 font-semibold">
                    🔥 Entry fee: <span className="font-bold text-yellow-400">{systemConfig.entry_fee || 0.1} GOR</span>
                  </p>
                </div>
                <button
                  onClick={handleSubmitChoice}
                  disabled={submitting}
                  className="dragon-button px-8 py-4 rounded-lg font-bold text-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center mx-auto dragon-scale-hover"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      ⚔️ JOINING BATTLE...
                    </>
                  ) : (
                    <>
                      <div className="text-2xl mr-2">
                        {selectedSide === 1 ? '🐉' : '🛡️'}
                      </div>
                      🔥 JOIN {selectedSide === 1 ? 'DRAGON' : 'KNIGHT'} SIDE!
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
              <div className="text-6xl dragon-wing">
                {userFighter.selected_number === 1 ? '🐉' : '🛡️'}
              </div>
              <Trophy className="h-16 w-16 text-green-400 dragon-breath" />
            </div>
            <h3 className="text-2xl font-bold text-amber-300 mb-2 dragon-meme-text">⚔️ YOU'RE IN THE BATTLE!</h3>
            <p className="text-green-300 font-bold text-xl mb-2">
              Fighting for: <span className="font-bold text-2xl text-amber-100 dragon-epic">
                {userFighter.selected_number === 1 ? 'DRAGON' : 'KNIGHT'}
              </span>
            </p>
            <p className="text-green-400 font-semibold">
              Side {userFighter.selected_number} • {userFighter.selected_number === 1 ? 'Dragon Army' : 'Knight Order'}
            </p>
            {userFighter.is_winner && (
              <div className="mt-4 p-4 dragon-winner rounded-lg">
                <p className="text-black font-bold text-2xl dragon-meme-text">
                  🎉 BATTLE VICTOR! ⚔️ Prize: {userFighter.prize_amount} GOR 💎
                </p>
              </div>
            )}
          </div>
        )}

        {/* Connect Wallet Prompt */}
        {!connected && (
          <div className="dragon-card rounded-xl p-6 text-center dragon-shadow">
            <Swords className="h-16 w-16 text-red-500 mx-auto mb-4 dragon-breath" />
            <h3 className="text-2xl font-bold text-amber-300 mb-2 dragon-meme-text">⚔️ CONNECT YOUR BATTLE WALLET</h3>
            <p className="text-amber-400 font-semibold">Connect your Backpack wallet to enter the battle arena</p>
          </div>
        )}

        {/* Battle Armies */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Dragon Army */}
          <div className="dragon-card rounded-xl p-6 dragon-shadow border border-red-500/30">
            <h3 className="text-xl font-bold text-red-300 mb-4 dragon-meme-text flex items-center">
              <div className="text-2xl mr-2">🐉</div>
              DRAGON ARMY ({dragonFighters.length})
            </h3>
            <div className="space-y-3 max-h-48 overflow-y-auto">
              {dragonFighters.length === 0 ? (
                <div className="text-center py-4 text-red-400 font-semibold">
                  No dragon fighters yet
                </div>
              ) : (
                dragonFighters.map((fighter) => (
                  <div
                    key={fighter.id}
                    className={`flex items-center justify-between p-3 rounded-lg transition-all dragon-scale-hover ${
                      fighter.is_winner ? 'dragon-winner border border-amber-500' : 'bg-red-900/20 border border-red-500/30'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">🐉</div>
                      <div>
                        <span className="font-mono text-sm text-amber-300 font-semibold block">
                          {fighter.wallet_address.slice(0, 8)}...{fighter.wallet_address.slice(-8)}
                        </span>
                        <span className="text-xs text-red-300 font-semibold">Dragon Warrior</span>
                      </div>
                    </div>
                    {fighter.is_winner && (
                      <div className="flex items-center text-black font-bold">
                        <Trophy className="h-4 w-4 mr-1" />
                        <span className="text-sm dragon-meme-text">{fighter.prize_amount} GOR</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Knight Order */}
          <div className="dragon-card rounded-xl p-6 dragon-shadow border border-blue-500/30">
            <h3 className="text-xl font-bold text-blue-300 mb-4 dragon-meme-text flex items-center">
              <div className="text-2xl mr-2">🛡️</div>
              KNIGHT ORDER ({knightFighters.length})
            </h3>
            <div className="space-y-3 max-h-48 overflow-y-auto">
              {knightFighters.length === 0 ? (
                <div className="text-center py-4 text-blue-400 font-semibold">
                  No knight fighters yet
                </div>
              ) : (
                knightFighters.map((fighter) => (
                  <div
                    key={fighter.id}
                    className={`flex items-center justify-between p-3 rounded-lg transition-all dragon-scale-hover ${
                      fighter.is_winner ? 'dragon-winner border border-amber-500' : 'bg-blue-900/20 border border-blue-500/30'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">🛡️</div>
                      <div>
                        <span className="font-mono text-sm text-amber-300 font-semibold block">
                          {fighter.wallet_address.slice(0, 8)}...{fighter.wallet_address.slice(-8)}
                        </span>
                        <span className="text-xs text-blue-300 font-semibold">Knight Champion</span>
                      </div>
                    </div>
                    {fighter.is_winner && (
                      <div className="flex items-center text-black font-bold">
                        <Trophy className="h-4 w-4 mr-1" />
                        <span className="text-sm dragon-meme-text">{fighter.prize_amount} GOR</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default FightDragonGame