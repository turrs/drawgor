import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { PublicKey } from '@solana/web3.js'
import { connectBackpackWallet, WalletContextType, connection, confirmTransactionWithRetry } from '../lib/wallet'

interface WalletProviderProps {
  children: ReactNode
}

const WalletContext = createContext<WalletContextType | null>(null)

export const useWallet = () => {
  const context = useContext(WalletContext)
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider')
  }
  return context
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const [wallet, setWallet] = useState<any>(null)
  const [connected, setConnected] = useState(false)
  const [publicKey, setPublicKey] = useState<PublicKey | null>(null)

  const connect = async () => {
    try {
      console.log('Attempting to connect wallet...')
      
      // Check if Backpack is available
      // @ts-ignore
      if (!window.backpack) {
        throw new Error('Backpack wallet not found. Please install Backpack extension.')
      }

      // @ts-ignore
      const backpack = window.backpack
      console.log('Backpack found, connecting...')
      
      const response = await backpack.connect()
      console.log('Backpack connection response:', response)
      
      const pubKey = new PublicKey(response.publicKey)
      
      setWallet(backpack)
      setPublicKey(pubKey)
      setConnected(true)
      
      // Store connection in localStorage
      localStorage.setItem('wallet_connected', 'true')
      localStorage.setItem('wallet_publicKey', pubKey.toString())
      
      console.log('Wallet connected successfully:', pubKey.toString())
    } catch (error) {
      console.error('Failed to connect wallet:', error)
      throw error
    }
  }

  const disconnect = () => {
    console.log('Disconnecting wallet...')
    setWallet(null)
    setPublicKey(null)
    setConnected(false)
    
    // Clear localStorage
    localStorage.removeItem('wallet_connected')
    localStorage.removeItem('wallet_publicKey')
    
    if (wallet) {
      try {
        wallet.disconnect()
      } catch (error) {
        console.error('Error disconnecting wallet:', error)
      }
    }
  }

  const signAndSendTransaction = async (transaction: any) => {
    if (!wallet || !connected || !publicKey) {
      throw new Error('Wallet not connected')
    }
    
    try {
      console.log('Signing transaction...')
      const signed = await wallet.signTransaction(transaction)
      console.log('Transaction signed, sending...')
      
      // Send transaction with better error handling
      const signature = await connection.sendRawTransaction(signed.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
        maxRetries: 3
      })
      
      console.log('Transaction sent, signature:', signature)
      
      // Use enhanced confirmation with retry logic
      const confirmed = await confirmTransactionWithRetry(signature, 5)
      
      if (!confirmed) {
        throw new Error('Transaction confirmation failed')
      }
      
      console.log('Transaction confirmed successfully:', signature)
      return signature
      
    } catch (error) {
      console.error('Transaction failed:', error)
      
      // Provide more specific error messages
      if (error.message.includes('insufficient funds')) {
        throw new Error('Insufficient funds in wallet')
      } else if (error.message.includes('blockhash not found')) {
        throw new Error('Transaction expired, please try again')
      } else if (error.message.includes('User rejected')) {
        throw new Error('Transaction was rejected by user')
      } else {
        throw new Error(`Transaction failed: ${error.message}`)
      }
    }
  }

  // Auto-reconnect on page load
  useEffect(() => {
    const wasConnected = localStorage.getItem('wallet_connected')
    const storedPublicKey = localStorage.getItem('wallet_publicKey')
    
    if (wasConnected && storedPublicKey) {
      console.log('Attempting auto-reconnect...')
      connect().catch(error => {
        console.error('Auto-reconnect failed:', error)
        // Clear stored connection if auto-reconnect fails
        localStorage.removeItem('wallet_connected')
        localStorage.removeItem('wallet_publicKey')
      })
    }
  }, [])

  const contextValue: WalletContextType = {
    wallet,
    connected,
    publicKey,
    connect,
    disconnect,
    signAndSendTransaction
  }

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  )
}