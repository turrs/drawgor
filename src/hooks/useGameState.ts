import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export interface Lobby {
  id: string
  created_at: string
  start_time: string
  end_time: string
  result_number: number | null
  status: 'waiting' | 'active' | 'completed'
  total_players: number
  total_amount: number
}

export interface Player {
  id: string
  lobby_id: string
  wallet_address: string
  selected_number: number
  transaction_hash: string | null
  is_winner: boolean
  prize_amount: number
  created_at: string
}

export const useGameState = () => {
  const [currentLobby, setCurrentLobby] = useState<Lobby | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [timeLeft, setTimeLeft] = useState(0)

  // Fetch current active lobby
  const fetchCurrentLobby = async () => {
    const { data, error } = await supabase
      .from('lobbies')
      .select('*')
      .in('status', ['waiting', 'active'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (data && !error) {
      setCurrentLobby(data)
      updateTimeLeft(data)
    } else {
      setCurrentLobby(null)
      setTimeLeft(0)
    }
    setLoading(false)
  }

  // Fetch players for current lobby
  const fetchPlayers = async (lobbyId: string) => {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('lobby_id', lobbyId)
      .order('created_at', { ascending: true })

    if (data && !error) {
      setPlayers(data)
      
      // Update lobby stats based on actual player count
      const playerCount = data.length
      const totalAmount = playerCount * 0.1 // 0.1 GOR per player
      
      // Update the current lobby state with real player count
      setCurrentLobby(prev => prev ? {
        ...prev,
        total_players: playerCount,
        total_amount: totalAmount
      } : null)
    }
  }

  // Update time left - fixed calculation
  const updateTimeLeft = (lobby: Lobby) => {
    const now = Date.now()
    let targetTime: number
    
    // If lobby is waiting, show time until start
    // If lobby is active, show time until end
    if (lobby.status === 'waiting') {
      targetTime = new Date(lobby.start_time).getTime()
    } else if (lobby.status === 'active') {
      targetTime = new Date(lobby.end_time).getTime()
    } else {
      setTimeLeft(0)
      return
    }
    
    const remaining = Math.max(0, Math.floor((targetTime - now) / 1000))
    setTimeLeft(remaining)
    
    console.log('Time calculation:', {
      status: lobby.status,
      now: new Date(now).toISOString(),
      targetTime: new Date(targetTime).toISOString(),
      remaining: remaining
    })
  }

  // Join lobby
  const joinLobby = async (walletAddress: string, selectedNumber: number, transactionHash: string) => {
    if (!currentLobby) return null

    const { data, error } = await supabase
      .from('players')
      .insert({
        lobby_id: currentLobby.id,
        wallet_address: walletAddress,
        selected_number: selectedNumber,
        transaction_hash: transactionHash
      })
      .select()
      .single()

    if (error) {
      console.error('Error joining lobby:', error)
      return null
    }

    // Immediately refresh players after joining
    if (currentLobby) {
      await fetchPlayers(currentLobby.id)
    }

    return data
  }

  // Subscribe to lobby changes
  useEffect(() => {
    fetchCurrentLobby()

    const lobbySubscription = supabase
      .channel('lobbies')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'lobbies'
      }, (payload) => {
        console.log('Lobby change:', payload)
        fetchCurrentLobby()
      })
      .subscribe()

    return () => {
      lobbySubscription.unsubscribe()
    }
  }, [])

  // Subscribe to player changes for current lobby
  useEffect(() => {
    if (!currentLobby) return

    fetchPlayers(currentLobby.id)

    const playersSubscription = supabase
      .channel(`players:${currentLobby.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'players',
        filter: `lobby_id=eq.${currentLobby.id}`
      }, (payload) => {
        console.log('Player change:', payload)
        fetchPlayers(currentLobby.id)
      })
      .subscribe()

    return () => {
      playersSubscription.unsubscribe()
    }
  }, [currentLobby?.id])

  // Update countdown timer every second AND refresh player data
  useEffect(() => {
    if (!currentLobby) return

    // Initial update
    updateTimeLeft(currentLobby)
    fetchPlayers(currentLobby.id) // Initial fetch

    const interval = setInterval(() => {
      updateTimeLeft(currentLobby)
      // Refresh player data every second to ensure real-time updates
      fetchPlayers(currentLobby.id)
    }, 1000)

    return () => clearInterval(interval)
  }, [currentLobby])

  return {
    currentLobby,
    players,
    loading,
    timeLeft,
    joinLobby,
    refetch: fetchCurrentLobby
  }
}