import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export interface FightDragonBattle {
  id: string
  created_at: string
  start_time: string
  end_time: string
  result_number: number | null
  status: 'waiting' | 'active' | 'completed'
  total_players: number
  total_amount: number
}

export interface FightDragonFighter {
  id: string
  lobby_id: string
  wallet_address: string
  selected_number: number
  transaction_hash: string | null
  is_winner: boolean
  prize_amount: number
  created_at: string
}

export const useFightDragonGameState = () => {
  const [currentBattle, setCurrentBattle] = useState<FightDragonBattle | null>(null)
  const [fighters, setFighters] = useState<FightDragonFighter[]>([])
  const [loading, setLoading] = useState(true)
  const [timeLeft, setTimeLeft] = useState(0)

  // Fetch current active battle
  const fetchCurrentBattle = async () => {
    const { data, error } = await supabase
      .from('fight_dragon_battles')
      .select('*')
      .in('status', ['waiting', 'active'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (data && !error) {
      setCurrentBattle(data)
      updateTimeLeft(data)
    } else {
      setCurrentBattle(null)
      setTimeLeft(0)
    }
    setLoading(false)
  }

  // Fetch fighters for current battle
  const fetchFighters = async (battleId: string) => {
    const { data, error } = await supabase
      .from('fight_dragon_players')
      .select('*')
      .eq('lobby_id', battleId)
      .order('created_at', { ascending: true })

    if (data && !error) {
      setFighters(data)
      
      // Update battle stats based on actual fighter count
      const fighterCount = data.length
      const totalAmount = fighterCount * 0.1 // 0.1 GOR per fighter
      
      // Update the current battle state with real fighter count
      setCurrentBattle(prev => prev ? {
        ...prev,
        total_players: fighterCount,
        total_amount: totalAmount
      } : null)
    }
  }

  // Update time left - fixed calculation
  const updateTimeLeft = (battle: FightDragonBattle) => {
    const now = Date.now()
    let targetTime: number
    
    // If battle is waiting, show time until start
    // If battle is active, show time until end
    if (battle.status === 'waiting') {
      targetTime = new Date(battle.start_time).getTime()
    } else if (battle.status === 'active') {
      targetTime = new Date(battle.end_time).getTime()
    } else {
      setTimeLeft(0)
      return
    }
    
    const remaining = Math.max(0, Math.floor((targetTime - now) / 1000))
    setTimeLeft(remaining)
    
    console.log('Fight Dragon Time calculation:', {
      status: battle.status,
      now: new Date(now).toISOString(),
      targetTime: new Date(targetTime).toISOString(),
      remaining: remaining
    })
  }

  // Join battle
  const joinBattle = async (walletAddress: string, selectedNumber: number, transactionHash: string) => {
    if (!currentBattle) return null

    const { data, error } = await supabase
      .from('fight_dragon_players')
      .insert({
        lobby_id: currentBattle.id,
        wallet_address: walletAddress,
        selected_number: selectedNumber,
        transaction_hash: transactionHash
      })
      .select()
      .single()

    if (error) {
      console.error('Error joining fight dragon battle:', error)
      return null
    }

    // Immediately refresh fighters after joining
    if (currentBattle) {
      await fetchFighters(currentBattle.id)
    }

    return data
  }

  // Subscribe to battle changes
  useEffect(() => {
    fetchCurrentBattle()

    const battleSubscription = supabase
      .channel('fight_dragon_battles')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'fight_dragon_battles'
      }, (payload) => {
        console.log('Fight Dragon Battle change:', payload)
        fetchCurrentBattle()
      })
      .subscribe()

    return () => {
      battleSubscription.unsubscribe()
    }
  }, [])

  // Subscribe to fighter changes for current battle
  useEffect(() => {
    if (!currentBattle) return

    fetchFighters(currentBattle.id)

    const fightersSubscription = supabase
      .channel(`fight_dragon_players:${currentBattle.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'fight_dragon_players',
        filter: `lobby_id=eq.${currentBattle.id}`
      }, (payload) => {
        console.log('Fight Dragon Fighter change:', payload)
        fetchFighters(currentBattle.id)
      })
      .subscribe()

    return () => {
      fightersSubscription.unsubscribe()
    }
  }, [currentBattle?.id])

  // Update countdown timer every second AND refresh fighter data
  useEffect(() => {
    if (!currentBattle) return

    // Initial update
    updateTimeLeft(currentBattle)
    fetchFighters(currentBattle.id) // Initial fetch

    const interval = setInterval(() => {
      updateTimeLeft(currentBattle)
      // Refresh fighter data every second to ensure real-time updates
      fetchFighters(currentBattle.id)
    }, 1000)

    return () => clearInterval(interval)
  }, [currentBattle])

  return {
    currentBattle,
    fighters,
    loading,
    timeLeft,
    joinBattle,
    refetch: fetchCurrentBattle
  }
}