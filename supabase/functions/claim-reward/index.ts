/*
# Claim Reward Edge Function

This function handles prize distribution to winners:
1. Validates the claim request and checks if reward is already claimed
2. Verifies player ownership and prize eligibility
3. **FIRST** marks reward as claimed in database to prevent double claims
4. **THEN** sends GOR from central wallet to winner's wallet using blockchain transaction
5. Updates database with transaction hash immediately after sending (no confirmation wait)

## Security Features
- Validates player ownership before processing
- Prevents double claiming through database checks BEFORE transaction
- Uses central wallet private key for secure transactions
- Tracks both entry and reward transaction hashes separately
- Assumes 100% transaction success rate - no confirmation wait

## Environment Variables
- SUPABASE_URL: Supabase project URL
- SUPABASE_SERVICE_ROLE_KEY: Service role key for admin operations
*/

import { createClient } from 'npm:@supabase/supabase-js@2'
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, Keypair } from 'npm:@solana/web3.js@1'
import bs58 from 'npm:bs58@5'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// GOR Chain RPC endpoint
const RPC_URL = 'https://rpc.gorbagana.wtf'

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🎁 Starting reward claim process...')
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    const requestBody = await req.json()
    console.log('📝 Request body:', requestBody)
    
    const { player_id, wallet_address } = requestBody

    if (!player_id || !wallet_address) {
      throw new Error('Missing required parameters: player_id and wallet_address')
    }

    console.log(`🔍 Processing reward claim for player: ${player_id}, wallet: ${wallet_address}`)

    // 1. Validate the player and check if reward is claimable
    console.log('🔍 Fetching player data...')
    const { data: player, error: playerError } = await supabaseClient
      .from('players')
      .select('*')
      .eq('id', player_id)
      .single()

    console.log('👤 Player query result:', { 
      playerId: player?.id,
      walletAddress: player?.wallet_address,
      isWinner: player?.is_winner,
      prizeAmount: player?.prize_amount,
      rewardClaimed: player?.reward_claimed,
      rewardTransactionHash: player?.reward_transaction_hash,
      error: playerError 
    })

    if (playerError) {
      throw new Error(`Failed to fetch player: ${playerError.message}`)
    }

    if (!player) {
      throw new Error('Player not found')
    }

    // Detailed validation
    if (player.wallet_address !== wallet_address) {
      throw new Error(`Wallet address mismatch. Expected: ${player.wallet_address}, Got: ${wallet_address}`)
    }

    if (!player.is_winner) {
      throw new Error('Player is not a winner')
    }

    if (player.reward_claimed) {
      throw new Error(`Reward already claimed. Transaction hash: ${player.reward_transaction_hash || 'N/A'}`)
    }

    if (!player.prize_amount || player.prize_amount <= 0) {
      throw new Error(`Invalid prize amount: ${player.prize_amount}`)
    }

    console.log(`✅ Valid claim: ${player.prize_amount} GOR for ${wallet_address}`)

    // 2. Get system configuration for central wallet
    console.log('🔧 Fetching system configuration...')
    const { data: config, error: configError } = await supabaseClient
      .from('system_config')
      .select('central_wallet_address, central_wallet_private_key')
      .limit(1)
      .single()

    console.log('⚙️ Config query result:', { 
      hasConfig: !!config, 
      hasWalletAddress: !!config?.central_wallet_address,
      hasPrivateKey: !!config?.central_wallet_private_key,
      error: configError 
    })

    if (configError) {
      throw new Error(`Failed to fetch config: ${configError.message}`)
    }

    if (!config) {
      throw new Error('System configuration not found')
    }

    if (!config.central_wallet_address || !config.central_wallet_private_key) {
      throw new Error('Central wallet not properly configured. Please contact admin to set up wallet credentials.')
    }

    console.log(`💰 Central wallet address: ${config.central_wallet_address}`)

    // 3. CRITICAL: Mark reward as claimed FIRST to prevent double claims
    console.log('🔒 Marking reward as claimed in database to prevent double claims...')
    const { error: claimError } = await supabaseClient
      .from('players')
      .update({ 
        reward_claimed: true,
        reward_transaction_hash: 'PROCESSING' // Temporary marker
      })
      .eq('id', player_id)
      .eq('reward_claimed', false) // Only update if still unclaimed

    if (claimError) {
      throw new Error(`Failed to mark reward as claimed: ${claimError.message}`)
    }

    console.log('✅ Reward marked as claimed in database')

    // 4. Create and send blockchain transaction (NO CONFIRMATION WAIT)
    let transactionSignature: string | null = null
    
    try {
      console.log('🌐 Connecting to GOR Chain...')
      const connection = new Connection(RPC_URL, 'confirmed')
      
      // Test connection
      try {
        const slot = await connection.getSlot()
        console.log(`📡 Connected to GOR Chain, current slot: ${slot}`)
      } catch (connectionError) {
        throw new Error(`Failed to connect to GOR Chain: ${connectionError.message}`)
      }
      
      // Create keypair from private key
      console.log('🔑 Processing private key...')
      let privateKeyBytes: Uint8Array
      
      try {
        // First try base58 format (standard Solana format)
        console.log('🔑 Trying base58 decode...')
        privateKeyBytes = bs58.decode(config.central_wallet_private_key)
        console.log(`🔑 Base58 decode successful, key length: ${privateKeyBytes.length} bytes`)
      } catch (base58Error) {
        console.log('🔑 Base58 decode failed, trying comma-separated format...')
        try {
          // Fallback to comma-separated array format
          const keyArray = config.central_wallet_private_key.split(',').map(num => parseInt(num.trim()))
          privateKeyBytes = new Uint8Array(keyArray)
          console.log(`🔑 Array format successful, key length: ${privateKeyBytes.length} bytes`)
        } catch (arrayError) {
          throw new Error(`Invalid private key format. Please ensure the private key is in base58 format. Base58 error: ${base58Error.message}, Array error: ${arrayError.message}`)
        }
      }
      
      // Validate private key size (should be 64 bytes for Solana)
      if (privateKeyBytes.length !== 64) {
        throw new Error(`Invalid private key size: ${privateKeyBytes.length} bytes. Expected 64 bytes for Solana private key.`)
      }
      
      console.log('🔑 Creating keypair from private key...')
      const centralWallet = Keypair.fromSecretKey(privateKeyBytes)
      
      // Validate that the derived public key matches the configured address
      const derivedAddress = centralWallet.publicKey.toString()
      if (derivedAddress !== config.central_wallet_address) {
        throw new Error(`Private key does not match configured wallet address. Expected: ${config.central_wallet_address}, Derived: ${derivedAddress}`)
      }
      
      // Validate addresses
      const fromPubkey = centralWallet.publicKey
      const toPubkey = new PublicKey(wallet_address)
      
      console.log(`📤 Transfer details:`)
      console.log(`   Amount: ${player.prize_amount} GOR`)
      console.log(`   From: ${fromPubkey.toString()}`)
      console.log(`   To: ${toPubkey.toString()}`)
      console.log(`   Lamports: ${Math.floor(player.prize_amount * LAMPORTS_PER_SOL)}`)

      // Check central wallet balance
      console.log('💰 Checking central wallet balance...')
      const centralWalletBalance = await connection.getBalance(fromPubkey)
      const centralWalletBalanceGOR = centralWalletBalance / LAMPORTS_PER_SOL
      const requiredAmount = player.prize_amount
      const transactionFee = 0.000005 // Approximate transaction fee in GOR
      
      console.log(`💰 Central wallet balance: ${centralWalletBalanceGOR.toFixed(6)} GOR`)
      console.log(`💰 Required amount: ${requiredAmount} GOR`)
      console.log(`💰 Estimated fee: ${transactionFee} GOR`)
      
      if (centralWalletBalanceGOR < (requiredAmount + transactionFee)) {
        throw new Error(`Insufficient funds in central wallet. Balance: ${centralWalletBalanceGOR.toFixed(6)} GOR, Required: ${(requiredAmount + transactionFee).toFixed(6)} GOR (including fees)`)
      }

      // Create transaction
      console.log('📝 Creating transaction...')
      const transaction = new Transaction()
      
      // Add transfer instruction
      const transferInstruction = SystemProgram.transfer({
        fromPubkey,
        toPubkey,
        lamports: Math.floor(player.prize_amount * LAMPORTS_PER_SOL) // Convert GOR to lamports
      })
      
      transaction.add(transferInstruction)
      
      // Get latest blockhash
      console.log('🔗 Getting latest blockhash...')
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
      transaction.recentBlockhash = blockhash
      transaction.lastValidBlockHeight = lastValidBlockHeight
      transaction.feePayer = fromPubkey
      
      console.log(`🔗 Blockhash: ${blockhash}`)
      console.log(`🔗 Last valid block height: ${lastValidBlockHeight}`)
      
      // Sign transaction
      console.log('✍️ Signing transaction...')
      transaction.sign(centralWallet)
      
      // Send transaction (NO CONFIRMATION WAIT - ASSUME 100% SUCCESS)
      console.log('📡 Sending transaction...')
      const signature = await connection.sendRawTransaction(transaction.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
        maxRetries: 3
      })
      
      console.log(`📡 Transaction sent with signature: ${signature}`)
      console.log(`🚀 ASSUMING 100% SUCCESS - NO CONFIRMATION WAIT`)
      transactionSignature = signature

      // 5. Update database with transaction hash immediately (no confirmation wait)
      console.log('💾 Updating database with transaction hash...')
      const { error: updateError } = await supabaseClient
        .from('players')
        .update({ 
          reward_transaction_hash: signature // Replace 'PROCESSING' with actual hash
        })
        .eq('id', player_id)

      if (updateError) {
        console.error('❌ Failed to update transaction hash:', updateError)
        // Transaction sent but hash update failed - not critical
        console.log('⚠️ Transaction sent but failed to update hash in database')
      }

      console.log(`🎉 Reward claim completed successfully!`)
      console.log(`📊 Summary:`)
      console.log(`   Player ID: ${player_id}`)
      console.log(`   Wallet: ${wallet_address}`)
      console.log(`   Amount: ${player.prize_amount} GOR`)
      console.log(`   Reward Transaction: ${signature}`)
      console.log(`   Entry Transaction: ${player.transaction_hash || 'N/A'}`)
      console.log(`   Explorer: https://explorer.gorbagana.wtf/tx/${signature}`)
      console.log(`   Status: SENT (assuming success)`)

      return new Response(
        JSON.stringify({
          success: true,
          message: `Successfully sent ${player.prize_amount} GOR to your wallet`,
          transaction_signature: signature,
          amount: player.prize_amount,
          recipient: wallet_address,
          explorer_url: `https://explorer.gorbagana.wtf/tx/${signature}`,
          claim_details: {
            player_id: player_id,
            entry_transaction: player.transaction_hash,
            reward_transaction: signature,
            timestamp: new Date().toISOString(),
            status: 'SENT_NO_CONFIRMATION'
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )

    } catch (blockchainError) {
      // Blockchain transaction failed - rollback database changes
      console.error('❌ Blockchain transaction failed, rolling back database changes...')
      
      const { error: rollbackError } = await supabaseClient
        .from('players')
        .update({ 
          reward_claimed: false,
          reward_transaction_hash: null
        })
        .eq('id', player_id)

      if (rollbackError) {
        console.error('❌ CRITICAL: Failed to rollback database changes:', rollbackError)
        throw new Error(`Blockchain transaction failed AND database rollback failed. Manual intervention required for player ${player_id}. Original error: ${blockchainError.message}`)
      }

      console.log('✅ Database changes rolled back successfully')
      throw blockchainError
    }

  } catch (error) {
    console.error('❌ Reward claim error:', error)
    console.error('❌ Error stack:', error.stack)
    
    // Provide more specific error messages for common issues
    let userFriendlyMessage = error.message
    
    if (error.message.includes('insufficient funds')) {
      userFriendlyMessage = 'Insufficient funds in the prize pool. Please contact support.'
    } else if (error.message.includes('already claimed')) {
      userFriendlyMessage = 'This reward has already been claimed.'
    } else if (error.message.includes('not a winner')) {
      userFriendlyMessage = 'You are not eligible for a reward in this game.'
    } else if (error.message.includes('wallet address mismatch')) {
      userFriendlyMessage = 'You can only claim rewards for your own wallet address.'
    } else if (error.message.includes('not properly configured')) {
      userFriendlyMessage = 'System configuration error. Please contact support.'
    }
    
    return new Response(
      JSON.stringify({
        success: false,
        error: userFriendlyMessage,
        technical_error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})