/*
# Lobby Scheduler Edge Function

This function runs automatically to:
1. Create new game lobbies when needed
2. Process completed lobbies and determine winners
3. Ensure only one active lobby exists at a time
4. Auto-generate winning numbers and complete games
5. Distribute prizes equally among multiple winners

## How it works
- Creates a new lobby when none exists
- Each lobby has 1-minute duration with 10-second waiting period
- After lobby ends, generates winning number (1-10) and processes winners
- If multiple winners, prize is divided equally among them
- Ensures seamless game flow for all users

## Environment Variables
- SUPABASE_URL: Supabase project URL
- SUPABASE_SERVICE_ROLE_KEY: Service role key for admin operations
*/

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Lobby {
  id: string
  start_time: string
  end_time: string
  status: 'waiting' | 'active' | 'completed'
  result_number?: number
  total_players: number
  total_amount: number
}

interface Player {
  id: string
  lobby_id: string
  wallet_address: string
  selected_number: number
  transaction_hash: string | null
  is_winner: boolean
  prize_amount: number
  reward_claimed: boolean
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    const now = new Date()
    const currentTime = now.toISOString()

    console.log(`🎮 Lobby scheduler running at ${currentTime}`)

    let processedLobbies = 0
    let activatedLobbies = 0
    let createdNewLobby = false

    // STEP 1: Process completed lobbies (active lobbies past end time)
    const { data: expiredLobbies } = await supabaseClient
      .from('lobbies')
      .select('*')
      .eq('status', 'active')
      .lt('end_time', currentTime)

    console.log(`🔍 Found ${expiredLobbies?.length || 0} expired lobbies to complete`)

    for (const lobby of expiredLobbies || []) {
      await processCompletedLobby(supabaseClient, lobby)
      processedLobbies++
    }

    // STEP 2: Activate waiting lobbies (waiting lobbies past start time)
    const { data: waitingLobbies } = await supabaseClient
      .from('lobbies')
      .select('*')
      .eq('status', 'waiting')
      .lt('start_time', currentTime)

    console.log(`⏰ Found ${waitingLobbies?.length || 0} waiting lobbies to activate`)

    for (const lobby of waitingLobbies || []) {
      await supabaseClient
        .from('lobbies')
        .update({ status: 'active' })
        .eq('id', lobby.id)
      
      console.log(`✅ Lobby activated: ${lobby.id}`)
      activatedLobbies++
    }

    // STEP 3: Check if we need to create a new lobby
    const { data: currentLobby } = await supabaseClient
      .from('lobbies')
      .select('*')
      .in('status', ['waiting', 'active'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    console.log(`🎯 Current lobby status: ${currentLobby ? `${currentLobby.status} (${currentLobby.id})` : 'none'}`)

    // Create new lobby if:
    // 1. No active/waiting lobby exists, OR
    // 2. Current lobby is about to end (less than 15 seconds remaining)
    let shouldCreateLobby = false
    
    if (!currentLobby) {
      console.log('📝 No active lobby found - creating new one')
      shouldCreateLobby = true
    } else {
      const endTime = new Date(currentLobby.end_time).getTime()
      const timeRemaining = endTime - now.getTime()
      
      if (timeRemaining < 15000) { // Less than 15 seconds
        console.log(`⏳ Current lobby ending soon (${Math.floor(timeRemaining/1000)}s remaining) - creating next lobby`)
        shouldCreateLobby = true
      }
    }

    if (shouldCreateLobby) {
      await createNewLobby(supabaseClient)
      createdNewLobby = true
    }

    const response = {
      success: true,
      message: 'Lobby scheduler executed successfully',
      timestamp: currentTime,
      stats: {
        processedLobbies,
        activatedLobbies,
        createdNewLobby,
        currentLobby: currentLobby?.id || null,
        currentStatus: currentLobby?.status || null
      }
    }

    console.log('📊 Scheduler completed:', response.stats)

    return new Response(
      JSON.stringify(response),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Lobby scheduler error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function createNewLobby(supabaseClient: any) {
  const now = new Date()
  
  // Create lobby that starts in 10 seconds and runs for 60 seconds
  const startTime = new Date(now.getTime() + 10000) // Start in 10 seconds
  const endTime = new Date(startTime.getTime() + 60000) // 1 minute duration

  const { data, error } = await supabaseClient
    .from('lobbies')
    .insert({
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      status: 'waiting',
      total_players: 0,
      total_amount: 0
    })
    .select()
    .single()

  if (error) {
    console.error('❌ Error creating lobby:', error)
    throw error
  }

  console.log(`🎮 Created new lobby: ${data.id}`)
  console.log(`⏰ Starts: ${startTime.toISOString()}`)
  console.log(`🏁 Ends: ${endTime.toISOString()}`)
  
  return data
}

async function processCompletedLobby(supabaseClient: any, lobby: Lobby) {
  console.log(`🎯 Processing completed lobby: ${lobby.id}`)

  try {
    // Generate random winning number (1-10)
    const winningNumber = Math.floor(Math.random() * 10) + 1
    console.log(`🎲 Generated winning number: ${winningNumber}`)

    // Get all players for this lobby
    const { data: players, error: playersError } = await supabaseClient
      .from('players')
      .select('*')
      .eq('lobby_id', lobby.id)

    if (playersError) {
      console.error('❌ Error fetching players:', playersError)
      throw playersError
    }

    const totalPlayers = players?.length || 0
    console.log(`👥 Total players: ${totalPlayers}`)

    // Calculate prize distribution
    const entryFee = 0.1 // GOR per player
    const totalPrizePool = totalPlayers * entryFee
    const platformFeeRate = 0.03 // 3%
    const platformFee = totalPrizePool * platformFeeRate
    const prizePoolAfterFee = totalPrizePool - platformFee

    // Find winners (players who selected the winning number)
    const winners = players?.filter(p => p.selected_number === winningNumber) || []
    const winnersCount = winners.length
    
    // 🎯 KEY FEATURE: Divide prize equally among multiple winners
    const prizePerWinner = winnersCount > 0 ? prizePoolAfterFee / winnersCount : 0

    console.log(`🏆 Winners: ${winnersCount}`)
    console.log(`💰 Total prize pool: ${totalPrizePool.toFixed(4)} GOR`)
    console.log(`💸 Platform fee: ${platformFee.toFixed(4)} GOR`)
    console.log(`🎁 Prize pool after fee: ${prizePoolAfterFee.toFixed(4)} GOR`)
    console.log(`💎 Prize per winner: ${prizePerWinner.toFixed(4)} GOR`)

    // Update winners in database
    if (winnersCount > 0) {
      for (const winner of winners) {
        const { error: updateError } = await supabaseClient
          .from('players')
          .update({
            is_winner: true,
            prize_amount: prizePerWinner,
            reward_claimed: false // Initialize as unclaimed
          })
          .eq('id', winner.id)

        if (updateError) {
          console.error(`❌ Error updating winner ${winner.id}:`, updateError)
        } else {
          console.log(`✅ Updated winner: ${winner.wallet_address} - ${prizePerWinner.toFixed(4)} GOR (unclaimed)`)
        }
      }
      
      console.log(`🎉 ${winnersCount} winner(s) will receive ${prizePerWinner.toFixed(4)} GOR each`)
    } else {
      console.log('😔 No winners this round')
    }

    // Update lobby to completed status
    const { error: lobbyUpdateError } = await supabaseClient
      .from('lobbies')
      .update({
        status: 'completed',
        result_number: winningNumber,
        total_players: totalPlayers,
        total_amount: totalPrizePool
      })
      .eq('id', lobby.id)

    if (lobbyUpdateError) {
      console.error('❌ Error updating lobby:', lobbyUpdateError)
      throw lobbyUpdateError
    }

    console.log(`✅ Lobby ${lobby.id} completed successfully`)
    console.log(`🎯 Winning number: ${winningNumber}`)
    console.log(`👥 Players: ${totalPlayers}`)
    console.log(`💰 Total pool: ${totalPrizePool.toFixed(4)} GOR`)
    console.log(`🏆 Winners can now claim their rewards via the History page`)

  } catch (error) {
    console.error(`❌ Error processing lobby ${lobby.id}:`, error)
    
    // Mark lobby as completed even if there was an error to prevent infinite processing
    await supabaseClient
      .from('lobbies')
      .update({
        status: 'completed',
        result_number: Math.floor(Math.random() * 10) + 1, // Fallback random number
        total_players: 0,
        total_amount: 0
      })
      .eq('id', lobby.id)
  }
}