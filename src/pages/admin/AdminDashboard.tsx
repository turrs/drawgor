import React, { useState, useEffect } from 'react'
import { 
  BarChart3, 
  Users, 
  DollarSign, 
  Trophy, 
  Settings, 
  LogOut,
  Wallet,
  Key,
  Save,
  Eye,
  EyeOff
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useNavigate } from 'react-router-dom'

interface SystemConfig {
  central_wallet_address: string
  central_wallet_private_key: string
  platform_fee_percentage: number
  entry_fee: number
}

interface GameStats {
  total_gor_collected: number
  total_lobbies: number
  unique_players: number
  total_fees: number
}

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<GameStats>({
    total_gor_collected: 0,
    total_lobbies: 0,
    unique_players: 0,
    total_fees: 0
  })
  const [config, setConfig] = useState<SystemConfig>({
    central_wallet_address: '',
    central_wallet_private_key: '',
    platform_fee_percentage: 3,
    entry_fee: 0.1
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showPrivateKey, setShowPrivateKey] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // Check authentication
    const isAuthenticated = localStorage.getItem('admin_authenticated')
    if (!isAuthenticated) {
      navigate('/admin/login')
      return
    }

    fetchStats()
    fetchConfig()
  }, [navigate])

  const fetchStats = async () => {
    try {
      // Get stats from game_stats table
      const { data: gameStats, error: statsError } = await supabase
        .from('game_stats')
        .select('*')
        .limit(1)
        .maybeSingle()

      if (gameStats && !statsError) {
        setStats({
          total_gor_collected: gameStats.total_gor_collected || 0,
          total_lobbies: gameStats.total_lobbies || 0,
          unique_players: gameStats.unique_players || 0,
          total_fees: gameStats.total_fees || 0
        })
      } else {
        // Fallback: Calculate stats manually if game_stats is empty
        const { data: lobbies } = await supabase
          .from('lobbies')
          .select('total_players, total_amount')

        const { data: players } = await supabase
          .from('players')
          .select('wallet_address')

        const totalLobbies = lobbies?.length || 0
        const totalGorCollected = lobbies?.reduce((sum, lobby) => sum + (lobby.total_amount || 0), 0) || 0
        const uniquePlayersSet = new Set(players?.map(p => p.wallet_address) || [])
        const uniquePlayersCount = uniquePlayersSet.size
        const totalFees = totalGorCollected * 0.03 // 3% fee

        setStats({
          total_gor_collected: totalGorCollected,
          total_lobbies: totalLobbies,
          unique_players: uniquePlayersCount,
          total_fees: totalFees
        })
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('system_config')
        .select('*')
        .limit(1)
        .maybeSingle()

      if (data && !error) {
        setConfig({
          central_wallet_address: data.central_wallet_address || '',
          central_wallet_private_key: data.central_wallet_private_key || '',
          platform_fee_percentage: data.platform_fee_percentage || 3,
          entry_fee: data.entry_fee || 0.1
        })
        console.log('Loaded config:', {
          ...data,
          central_wallet_private_key: data.central_wallet_private_key ? '[HIDDEN]' : '[EMPTY]'
        })
      } else if (error) {
        console.error('Error fetching config:', error)
      } else {
        // No config exists, use defaults
        console.log('No system config found, using defaults')
        setConfig({
          central_wallet_address: '',
          central_wallet_private_key: '',
          platform_fee_percentage: 3,
          entry_fee: 0.1
        })
      }
    } catch (error) {
      console.error('Error fetching config:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveConfig = async () => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('system_config')
        .upsert({
          id: '1',
          central_wallet_address: config.central_wallet_address,
          central_wallet_private_key: config.central_wallet_private_key,
          platform_fee_percentage: config.platform_fee_percentage,
          entry_fee: config.entry_fee,
          updated_at: new Date().toISOString()
        })

      if (!error) {
        alert('Configuration saved successfully!')
        console.log('Config saved successfully')
      } else {
        console.error('Save error:', error)
        alert('Failed to save configuration: ' + error.message)
      }
    } catch (error) {
      console.error('Error saving config:', error)
      alert('Failed to save configuration: ' + (error as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('admin_authenticated')
    navigate('/admin/login')
  }

  const validateWalletAddress = (address: string) => {
    // Basic Solana address validation (44 characters, base58)
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/
    return base58Regex.test(address)
  }

  const validatePrivateKey = (privateKey: string) => {
    if (!privateKey) return true // Optional field
    
    // Check if it's a valid base58 string (typical Solana private key length is 88 characters)
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{87,88}$/
    return base58Regex.test(privateKey)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading admin dashboard...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6">
            <div className="flex items-center space-x-4">
              <DollarSign className="h-10 w-10 text-green-400" />
              <div>
                <div className="text-2xl font-bold">{stats.total_gor_collected.toFixed(2)}</div>
                <div className="text-sm text-gray-400">Total GOR Collected</div>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6">
            <div className="flex items-center space-x-4">
              <BarChart3 className="h-10 w-10 text-blue-400" />
              <div>
                <div className="text-2xl font-bold">{stats.total_lobbies}</div>
                <div className="text-sm text-gray-400">Total Lobbies</div>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6">
            <div className="flex items-center space-x-4">
              <Users className="h-10 w-10 text-purple-400" />
              <div>
                <div className="text-2xl font-bold">{stats.unique_players}</div>
                <div className="text-sm text-gray-400">Unique Players</div>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6">
            <div className="flex items-center space-x-4">
              <Trophy className="h-10 w-10 text-yellow-400" />
              <div>
                <div className="text-2xl font-bold">{stats.total_fees.toFixed(2)}</div>
                <div className="text-sm text-gray-400">Platform Fees</div>
              </div>
            </div>
          </div>
        </div>

        {/* System Configuration */}
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6">
          <div className="flex items-center space-x-2 mb-6">
            <Settings className="h-6 w-6" />
            <h2 className="text-xl font-bold">System Configuration</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Wallet Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center space-x-2">
                <Wallet className="h-5 w-5" />
                <span>Wallet Settings</span>
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Central Wallet Address *
                </label>
                <input
                  type="text"
                  value={config.central_wallet_address}
                  onChange={(e) => setConfig({ ...config, central_wallet_address: e.target.value })}
                  className={`w-full bg-gray-800 border rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-white focus:border-transparent ${
                    config.central_wallet_address && !validateWalletAddress(config.central_wallet_address)
                      ? 'border-red-500'
                      : 'border-gray-600'
                  }`}
                  placeholder="Enter GOR Chain wallet address (e.g., 11111111111111111111111111111112)"
                />
                {config.central_wallet_address && !validateWalletAddress(config.central_wallet_address) && (
                  <p className="text-xs text-red-400 mt-1">
                    Invalid wallet address format
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  This wallet will receive all game entry fees
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Private Key (Optional)
                </label>
                <div className="relative">
                  <input
                    type={showPrivateKey ? "text" : "password"}
                    value={config.central_wallet_private_key}
                    onChange={(e) => setConfig({ ...config, central_wallet_private_key: e.target.value })}
                    className={`w-full bg-gray-800 border rounded-lg px-4 py-2 pr-10 text-white focus:ring-2 focus:ring-white focus:border-transparent ${
                      config.central_wallet_private_key && !validatePrivateKey(config.central_wallet_private_key)
                        ? 'border-red-500'
                        : 'border-gray-600'
                    }`}
                    placeholder="Enter base58 encoded private key for automated prize distribution"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPrivateKey(!showPrivateKey)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showPrivateKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {config.central_wallet_private_key && !validatePrivateKey(config.central_wallet_private_key) && (
                  <p className="text-xs text-red-400 mt-1">
                    Invalid private key format. Please use base58 encoded private key.
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Required for automatic prize distribution. Leave empty for manual distribution. Must be in base58 format.
                </p>
              </div>
            </div>

            {/* Game Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center space-x-2">
                <Key className="h-5 w-5" />
                <span>Game Settings</span>
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Platform Fee (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={config.platform_fee_percentage}
                  onChange={(e) => setConfig({ ...config, platform_fee_percentage: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-white focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Percentage of total pot taken as platform fee
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Entry Fee (GOR)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={config.entry_fee}
                  onChange={(e) => setConfig({ ...config, entry_fee: parseFloat(e.target.value) || 0.01 })}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-white focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Amount each player pays to join a game
                </p>
              </div>

              {/* Configuration Status */}
              <div className="bg-gray-800 rounded-lg p-4 mt-4">
                <h4 className="text-sm font-medium text-gray-300 mb-2">Configuration Status</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Central Wallet</span>
                    <span className={`text-sm ${config.central_wallet_address ? 'text-green-400' : 'text-red-400'}`}>
                      {config.central_wallet_address ? '✓ Configured' : '✗ Not Set'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Auto Distribution</span>
                    <span className={`text-sm ${config.central_wallet_private_key ? 'text-green-400' : 'text-yellow-400'}`}>
                      {config.central_wallet_private_key ? '✓ Enabled' : '⚠ Manual Only'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={saveConfig}
              disabled={saving || !config.central_wallet_address || !validateWalletAddress(config.central_wallet_address) || (config.central_wallet_private_key && !validatePrivateKey(config.central_wallet_private_key))}
              className="bg-white hover:bg-gray-100 text-black px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Save Configuration</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard