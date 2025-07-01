import React, { createContext, useContext, ReactNode } from 'react'
import { useSystemConfig, SystemConfig } from '../hooks/useSystemConfig'

interface SystemConfigContextType {
  config: SystemConfig | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

const SystemConfigContext = createContext<SystemConfigContextType | null>(null)

export const useSystemConfigContext = () => {
  const context = useContext(SystemConfigContext)
  if (!context) {
    throw new Error('useSystemConfigContext must be used within a SystemConfigProvider')
  }
  return context
}

interface SystemConfigProviderProps {
  children: ReactNode
}

export const SystemConfigProvider: React.FC<SystemConfigProviderProps> = ({ children }) => {
  const { config, loading, error, refetch } = useSystemConfig()

  return (
    <SystemConfigContext.Provider value={{ config, loading, error, refetch }}>
      {children}
    </SystemConfigContext.Provider>
  )
}