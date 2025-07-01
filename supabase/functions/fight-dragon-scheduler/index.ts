/*
# Fight Dragon Scheduler Edge Function

This function runs automatically to:
1. Create new fight dragon battles when needed
2. Process completed battles and determine winners
3. Ensure only one active battle exists at a time
4. Auto-generate winning side (Dragon vs Knight) and complete battles
5. Distribute prizes equally among multiple winners

## How it works
- Creates a new battle when none exists
- Each battle has 1-minute duration with 10-second waiting period
- After battle ends, determines winner (Dragon side 1 or Knight side 10) and processes winners
- If multiple winners on winning side, prize is divided equally among them
- Ensures seamless battle flow for all users

## Environment Variables
- SUPABASE_URL: Supabase project URL
- SUPABASE_SERVICE_ROLE_KEY: Service role key for admin operations
*/

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface FightDragonBattle {
  id: string
  start_time: string
  end_time: string
  status: 'waiting' | 'active' | 'completed'
  result_number?: number
  total_players: number
  total_amount: number
}

interface FightDragonFighter {
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
    // Get environment variables with fallback error handling
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    // Check if required environment variables are available
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing required environment variables')
      console.error('SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing')
      console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'Set' : 'Missing')
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required environment variables (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)',
          timestamp: new Date().toISOString(),
          debug: {
            supabaseUrl: !!supabaseUrl,
            serviceKey: !!supabaseServiceKey
          }
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const supabaseClient = createClient(
      supabaseUrl,
      supabaseServiceKey,
      { 
        auth: { persistSession: false },
        global: {
          headers: {
            'User-Agent': 'fight-dragon-scheduler-edge-function'
          }
        }
      }
    )

    const now = new Date()
    const currentTime = now.toISOString()

    console.log(`⚔️ Fight Dragon scheduler running at ${currentTime}`)

    let processedBattles = 0
    let activatedBattles = 0
    let createdNewBattle = false

    // STEP 1: Process completed battles (active battles past end time)
    const { data: expiredBattles, error: expiredError } = await supabaseClient
      .from('fight_dragon_battles')
      .select('*')
      .eq('status', 'active')
      .lt('end_time', currentTime)

    if (expiredError) {
      console.error('❌ Error fetching expired battles:', expiredError)
      throw new Error(`Failed to fetch expired battles: ${expiredError.message}`)
    }

    console.log(`🔍 Found ${expiredBattles?.length || 0} expired battles to complete`)

    for (const battle of expiredBattles || []) {
      await processCompletedBattle(supabaseClient, battle)
      processedBattles++
    }

    // STEP 2: Activate waiting battles (waiting battles past start time)
    const { data: waitingBattles, error: waitingError } = await supabaseClient
      .from('fight_dragon_battles')
      .select('*')
      .eq('status', 'waiting')
      .lt('start_time', currentTime)

    if (waitingError) {
      console.error('❌ Error fetching waiting battles:', waitingError)
      throw new Error(`Failed to fetch waiting battles: ${waitingError.message}`)
    }

    console.log(`⏰ Found ${waitingBattles?.length || 0} waiting battles to activate`)

    for (const battle of waitingBattles || []) {
      const { error: updateError } = await supabaseClient
        .from('fight_dragon_battles')
        .update({ status: 'active' })
        .eq('id', battle.id)
      
      if (updateError) {
        console.error(`❌ Error activating battle ${battle.id}:`, updateError)
      } else {
        console.log(`✅ Battle activated: ${battle.id}`)
        activatedBattles++
      }
    }

    // STEP 3: Check if we need to create a new battle
    const { data: currentBattle, error: currentBattleError } = await supabaseClient
      .from('fight_dragon_battles')
      .select('*')
      .in('status', ['waiting', 'active'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (currentBattleError) {
      console.error('❌ Error fetching current battle:', currentBattleError)
      throw new Error(`Failed to fetch current battle: ${currentBattleError.message}`)
    }

    console.log(`🎯 Current battle status: ${currentBattle ? `${currentBattle.status} (${currentBattle.id})` : 'none'}`)

    // Create new battle if:
    // 1. No active/waiting battle exists, OR
    // 2. Current battle is about to end (less than 15 seconds remaining)
    let shouldCreateBattle = false
    
    if (!currentBattle) {
      console.log('📝 No active battle found - creating new one')
      shouldCreateBattle = true
    } else {
      const endTime = new Date(currentBattle.end_time).getTime()
      const timeRemaining = endTime - now.getTime()
      
      if (timeRemaining < 15000) { // Less than 15 seconds
        console.log(`⏳ Current battle ending soon (${Math.floor(timeRemaining/1000)}s remaining) - creating next battle`)
        shouldCreateBattle = true
      }
    }

    if (shouldCreateBattle) {
      await createNewBattle(supabaseClient)
      createdNewBattle = true
    }

    const response = {
      success: true,
      message: 'Fight Dragon scheduler executed successfully',
      timestamp: currentTime,
      stats: {
        processedBattles,
        activatedBattles,
        createdNewBattle,
        currentBattle: currentBattle?.id || null,
        currentStatus: currentBattle?.status || null
      }
    }

    console.log('📊 Fight Dragon Scheduler completed:', response.stats)

    return new Response(
      JSON.stringify(response),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Fight Dragon scheduler error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Unknown error occurred',
        timestamp: new Date().toISOString(),
        stack: error.stack
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function createNewBattle(supabaseClient: any) {
  const now = new Date()
  
  // Create battle that starts in 10 seconds and runs for 60 seconds
  const startTime = new Date(now.getTime() + 10000) // Start in 10 seconds
  const endTime = new Date(startTime.getTime() + 60000) // 1 minute duration

  const { data, error } = await supabaseClient
    .from('fight_dragon_battles')
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
    console.error('❌ Error creating battle:', error)
    throw new Error(`Failed to create battle: ${error.message}`)
  }

  console.log(`⚔️ Created new battle: ${data.id}`)
  console.log(`⏰ Starts: ${startTime.toISOString()}`)
  console.log(`🏁 Ends: ${endTime.toISOString()}`)
  
  return data
}

async function processCompletedBattle(supabaseClient: any, battle: FightDragonBattle) {
  console.log(`⚔️ Processing completed battle: ${battle.id}`)

  try {
    // Generate random winning side (1 for Dragon, 10 for Knight)
    const winningSide = Math.random() < 0.5 ? 1 : 10
    console.log(`🎲 Generated winning side: ${winningSide === 1 ? 'Dragon (1)' : 'Knight (10)'}`)

    // Get all fighters for this battle
    const { data: fighters, error: fightersError } = await supabaseClient
      .from('fight_dragon_players')
      .select('*')
      .eq('lobby_id', battle.id)

    if (fightersError) {
      console.error('❌ Error fetching fighters:', fightersError)
      throw new Error(`Failed to fetch fighters: ${fightersError.message}`)
    }

    const totalFighters = fighters?.length || 0
    console.log(`👥 Total fighters: ${totalFighters}`)

    // Calculate prize distribution
    const entryFee = 0.1 // GOR per fighter
    const totalPrizePool = totalFighters * entryFee
    const platformFeeRate = 0.03 // 3%
    const platformFee = totalPrizePool * platformFeeRate
    const prizePoolAfterFee = totalPrizePool - platformFee

    // Find winners (fighters who selected the winning side)
    const winners = fighters?.filter(f => f.selected_number === winningSide) || []
    const winnersCount = winners.length
    
    // 🎯 KEY FEATURE: Divide prize equally among multiple winners
    const prizePerWinner = winnersCount > 0 ? prizePoolAfterFee / winnersCount : 0

    const dragonFighters = fighters?.filter(f => f.selected_number === 1).length || 0
    const knightFighters = fighters?.filter(f => f.selected_number === 10).length || 0

    console.log(`🐉 Dragon fighters: ${dragonFighters}`)
    console.log(`🛡️ Knight fighters: ${knightFighters}`)
    console.log(`🏆 Winners (${winningSide === 1 ? 'Dragon' : 'Knight'} side): ${winnersCount}`)
    console.log(`💰 Total prize pool: ${totalPrizePool.toFixed(4)} GOR`)
    console.log(`💸 Platform fee: ${platformFee.toFixed(4)} GOR`)
    console.log(`🎁 Prize pool after fee: ${prizePoolAfterFee.toFixed(4)} GOR`)
    console.log(`💎 Prize per winner: ${prizePerWinner.toFixed(4)} GOR`)

    // Update winners in database
    if (winnersCount > 0) {
      for (const winner of winners) {
        const { error: updateError } = await supabaseClient
          .from('fight_dragon_players')
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
      
      console.log(`🎉 ${winnersCount} winner(s) from ${winningSide === 1 ? 'Dragon' : 'Knight'} side will receive ${prizePerWinner.toFixed(4)} GOR each`)
    } else {
      console.log('😔 No winners this battle')
    }

    // Update battle to completed status
    const { error: battleUpdateError } = await supabaseClient
      .from('fight_dragon_battles')
      .update({
        status: 'completed',
        result_number: winningSide,
        total_players: totalFighters,
        total_amount: totalPrizePool
      })
      .eq('id', battle.id)

    if (battleUpdateError) {
      console.error('❌ Error updating battle:', battleUpdateError)
      throw new Error(`Failed to update battle: ${battleUpdateError.message}`)
    }

    console.log(`✅ Battle ${battle.id} completed successfully`)
    console.log(`⚔️ Winning side: ${winningSide === 1 ? 'Dragon' : 'Knight'} (${winningSide})`)
    console.log(`👥 Fighters: ${totalFighters} (🐉 ${dragonFighters} vs 🛡️ ${knightFighters})`)
    console.log(`💰 Total pool: ${totalPrizePool.toFixed(4)} GOR`)
    console.log(`🏆 Winners can now claim their battle rewards via the History page`)

  } catch (error) {
    console.error(`❌ Error processing battle ${battle.id}:`, error)
    
    // Mark battle as completed even if there was an error to prevent infinite processing
    await supabaseClient
      .from('fight_dragon_battles')
      .update({
        status: 'completed',
        result_number: Math.random() < 0.5 ? 1 : 10, // Fallback random side
        total_players: 0,
        total_amount: 0
      })
      .eq('id', battle.id)
  }
}