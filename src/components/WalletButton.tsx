import React, { useState } from 'react'
import { Wallet, Loader2, ExternalLink } from 'lucide-react'
import { useWallet } from '../contexts/WalletContext'
import { checkWalletBalance } from '../lib/wallet'

const WalletButton: React.FC = () => {
  const { connected, publicKey, connect, disconnect } = useWallet()
  const [connecting, setConnecting] = useState(false)
  const [balance, setBalance] = useState<number | null>(null)
  const [loadingBalance, setLoadingBalance] = useState(false)

  const handleConnect = async () => {
    try {
      setConnecting(true)
      await connect()
    } catch (error) {
      console.error('Failed to connect wallet:', error)
      alert('Failed to connect wallet. Please make sure Backpack is installed and unlocked.')
    } finally {
      setConnecting(false)
    }
  }

  const handleDisconnect = () => {
    disconnect()
    setBalance(null)
  }

  // Update balance when connected
  React.useEffect(() => {
    if (connected && publicKey) {
      setLoadingBalance(true)
      checkWalletBalance(publicKey)
        .then(setBalance)
        .catch(error => {
          console.error('Failed to fetch balance:', error)
          setBalance(0)
        })
        .finally(() => setLoadingBalance(false))
    }
  }, [connected, publicKey])

  if (connected && publicKey) {
    return (
      <div className="flex flex-col lg:flex-row items-end lg:items-center space-y-2 lg:space-y-0 lg:space-x-3">
        {/* Balance Card */}
        <div className="dragon-card rounded-lg px-2 py-1 md:px-3 md:py-2 border border-amber-500/30">
          <div className="flex items-center space-x-1 md:space-x-2">
            <Wallet className="h-3 w-3 md:h-4 md:w-4 text-green-400 dragon-breath" />
            <div className="flex flex-col">
              <span className="text-xs text-amber-400 font-bold">💎 DRAGON GOLD</span>
              <span className="font-mono text-xs md:text-sm text-amber-300 font-bold">
                {loadingBalance ? 'Loading...' : balance !== null ? `${balance.toFixed(4)} GOR` : 'Error'}
              </span>
            </div>
          </div>
        </div>
        
        {/* Wallet Info Card */}
        <div className="dragon-card rounded-lg px-2 py-1 md:px-3 md:py-2 border border-amber-500/30">
          <div className="flex items-center space-x-1 md:space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full dragon-breath"></div>
            <div className="flex flex-col">
              <span className="text-xs text-amber-400 font-bold">🐉 CONNECTED</span>
              <span className="font-mono text-xs md:text-sm text-amber-300 font-bold">
                <span className="md:hidden">
                  {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
                </span>
                <span className="hidden md:inline">
                  {publicKey.toString().slice(0, 6)}...{publicKey.toString().slice(-4)}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Disconnect Button */}
        <button
          onClick={handleDisconnect}
          className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 md:px-3 md:py-2 rounded-lg transition-colors text-xs md:text-sm font-bold dragon-scale-hover"
        >
          <span className="md:hidden">🔥</span>
          <span className="hidden md:inline">🔥 DISCONNECT</span>
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={handleConnect}
      disabled={connecting}
      className="dragon-button px-3 py-2 md:px-4 md:py-2 rounded-lg font-bold transition-all flex items-center space-x-1 md:space-x-2 disabled:opacity-50 disabled:cursor-not-allowed dragon-scale-hover text-xs md:text-sm"
    >
      {connecting ? (
        <Loader2 className="h-3 w-3 md:h-4 md:w-4 animate-spin" />
      ) : (
        <Wallet className="h-3 w-3 md:h-4 md:w-4" />
      )}
      <span className="dragon-meme-text">
        {connecting ? (
          <>
            <span className="md:hidden">SUMMON...</span>
            <span className="hidden md:inline">SUMMONING...</span>
          </>
        ) : (
          <>
            <span className="md:hidden">🐉 CONNECT</span>
            <span className="hidden md:inline">🐉 CONNECT DRAGON</span>
          </>
        )}
      </span>
    </button>
  )
}

export default WalletButton