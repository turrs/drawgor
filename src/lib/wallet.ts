import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js'

// Use GOR Chain RPC endpoint
const RPC_URL = import.meta.env.VITE_SOLANA_RPC_URL || 'https://rpc.gorbagana.wtf'
const WS_URL = import.meta.env.VITE_SOLANA_WS_URL || 'wss://rpc.gorbagana.wtf'

// Create connection with error handling for WebSocket
export const connection = new Connection(RPC_URL, {
  commitment: 'confirmed',
  // Only use WebSocket if explicitly configured and available
  wsEndpoint: undefined // Disable WebSocket to avoid connection errors
})

// Alternative connection with WebSocket for when needed
export const createConnectionWithWS = () => {
  try {
    return new Connection(RPC_URL, {
      commitment: 'confirmed',
      wsEndpoint: WS_URL
    })
  } catch (error) {
    console.warn('WebSocket connection failed, falling back to HTTP-only connection:', error)
    return connection
  }
}

export interface WalletContextType {
  wallet: any
  connected: boolean
  publicKey: PublicKey | null
  connect: () => Promise<void>
  disconnect: () => void
  signAndSendTransaction: (transaction: Transaction) => Promise<string>
}

export const connectBackpackWallet = async (): Promise<WalletContextType> => {
  if (typeof window === 'undefined') {
    throw new Error('Wallet connection requires browser environment')
  }

  // @ts-ignore
  const backpack = window.backpack
  
  if (!backpack) {
    throw new Error('Backpack wallet not found. Please install Backpack extension.')
  }

  try {
    const response = await backpack.connect()
    const publicKey = new PublicKey(response.publicKey)
    
    return {
      wallet: backpack,
      connected: true,
      publicKey,
      connect: async () => {
        await backpack.connect()
      },
      disconnect: () => {
        backpack.disconnect()
      },
      signAndSendTransaction: async (transaction: Transaction) => {
        const signed = await backpack.signTransaction(transaction)
        const signature = await connection.sendRawTransaction(signed.serialize())
        await connection.confirmTransaction(signature)
        return signature
      }
    }
  } catch (error) {
    console.error('Failed to connect wallet:', error)
    throw error
  }
}

export const createGameTransaction = async (
  fromPubkey: PublicKey,
  toPubkey: PublicKey,
  amount: number,
  gameId: string,
  selectedNumber: number
): Promise<Transaction> => {
  try {
    const transaction = new Transaction()
    
    // Add transfer instruction
    const transferInstruction = SystemProgram.transfer({
      fromPubkey,
      toPubkey,
      lamports: Math.floor(amount * LAMPORTS_PER_SOL) // Convert GOR to lamports
    })
    
    transaction.add(transferInstruction)
    
    // Get latest blockhash with retry logic
    let retries = 3
    let blockhash, lastValidBlockHeight
    
    while (retries > 0) {
      try {
        const result = await connection.getLatestBlockhash('confirmed')
        blockhash = result.blockhash
        lastValidBlockHeight = result.lastValidBlockHeight
        break
      } catch (error) {
        retries--
        if (retries === 0) {
          throw new Error(`Failed to get recent blockhash after 3 attempts: ${error.message}`)
        }
        // Wait 1 second before retrying
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
    
    transaction.recentBlockhash = blockhash
    transaction.lastValidBlockHeight = lastValidBlockHeight
    transaction.feePayer = fromPubkey
    
    console.log('Transaction created:', {
      from: fromPubkey.toString(),
      to: toPubkey.toString(),
      amount: amount,
      gameId: gameId,
      selectedNumber: selectedNumber,
      blockhash: blockhash,
      rpcUrl: RPC_URL
    })
    
    return transaction
  } catch (error) {
    console.error('Error creating transaction:', error)
    throw new Error(`Failed to create transaction: ${error.message}`)
  }
}

export const checkWalletBalance = async (publicKey: PublicKey): Promise<number> => {
  try {
    // Add retry logic for balance checking
    let retries = 3
    
    while (retries > 0) {
      try {
        const balance = await connection.getBalance(publicKey, 'confirmed')
        return balance / LAMPORTS_PER_SOL
      } catch (error) {
        retries--
        if (retries === 0) {
          throw new Error(`Failed to check balance after 3 attempts: ${error.message}`)
        }
        // Wait 1 second before retrying
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
    
    return 0 // This should never be reached due to the throw above
  } catch (error) {
    console.error('Error checking wallet balance:', error)
    throw new Error(`Failed to check balance: ${error.message}`)
  }
}

// Enhanced transaction confirmation with better error handling and polling
export const confirmTransactionWithRetry = async (signature: string, maxRetries = 10): Promise<boolean> => {
  let retries = 0
  
  while (retries < maxRetries) {
    try {
      console.log(`Confirming transaction attempt ${retries + 1}/${maxRetries}:`, signature)
      
      // First, check if transaction exists on chain
      const txInfo = await connection.getTransaction(signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0
      })
      
      if (txInfo) {
        console.log('Transaction found on chain and confirmed:', signature)
        return true
      }
      
      // If not found, wait and retry
      retries++
      if (retries >= maxRetries) {
        console.error('Transaction not found after maximum retries')
        return false
      }
      
      // Wait before retrying (progressive delay)
      const delay = Math.min(1000 + (retries * 500), 5000) // Max 5 second delay
      console.log(`Transaction not found yet, waiting ${delay}ms before retry...`)
      await new Promise(resolve => setTimeout(resolve, delay))
      
    } catch (error) {
      retries++
      console.warn(`Transaction confirmation attempt ${retries} failed:`, error.message)
      
      if (retries >= maxRetries) {
        console.error(`Transaction confirmation failed after ${maxRetries} attempts:`, error.message)
        return false
      }
      
      // Wait before retrying (exponential backoff)
      const delay = Math.min(1000 * Math.pow(2, retries - 1), 10000) // Max 10 second delay
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  return false
}

// Simple transaction status check
export const checkTransactionStatus = async (signature: string): Promise<boolean> => {
  try {
    const txInfo = await connection.getTransaction(signature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0
    })
    
    return !!txInfo
  } catch (error) {
    console.error('Error checking transaction status:', error)
    return false
  }
}