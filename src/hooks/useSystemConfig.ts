import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export interface SystemConfig {
  central_wallet_address: string
  central_wallet_private_key: string
  platform_fee_percentage: number
  entry_fee: number
}

export const useSystemConfig = () => {
  const [config, setConfig] = useState<SystemConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchConfig = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('system_config')
        .select('*')
        .limit(1)
        .maybeSingle()

      if (fetchError) {
        console.error('Error fetching system config:', fetchError)
        setError('Failed to load system configuration')
        return
      }

      if (!data) {
        // Initialize default system config if it doesn't exist
        console.log('No system config found, creating default...')
        const defaultConfig = {
          id: '1',
          central_wallet_address: '',
          central_wallet_private_key: '',
          platform_fee_percentage: 3.00,
          entry_fee: 0.1
        }

        const { error: insertError } = await supabase
          .from('system_config')
          .insert(defaultConfig)

        if (insertError) {
          console.error('Error creating default config:', insertError)
          setError('Failed to initialize system configuration')
          return
        }

        setConfig({
          central_wallet_address: '',
          central_wallet_private_key: '',
          platform_fee_percentage: 3.00,
          entry_fee: 0.1
        })
      } else {
        setConfig({
          central_wallet_address: data.central_wallet_address || '',
          central_wallet_private_key: data.central_wallet_private_key || '',
          platform_fee_percentage: data.platform_fee_percentage || 3.00,
          entry_fee: data.entry_fee || 0.1
        })
      }
    } catch (error) {
      console.error('Error in fetchConfig:', error)
      setError('Failed to load system configuration')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConfig()
  }, [])

  return {
    config,
    loading,
    error,
    refetch: fetchConfig
  }
}