import React, { useState, useEffect } from 'react'
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react'

export interface NotificationProps {
  id: string
  type: 'success' | 'error' | 'info'
  title: string
  message: string
  duration?: number
  onClose: (id: string) => void
}

const Notification: React.FC<NotificationProps> = ({
  id,
  type,
  title,
  message,
  duration = 5000,
  onClose
}) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose(id)
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [id, duration, onClose])

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-400" />
      case 'error':
        return <XCircle className="h-5 w-5 text-red-400" />
      case 'info':
        return <AlertCircle className="h-5 w-5 text-blue-400" />
    }
  }

  const getBgColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-900/90 border-green-700'
      case 'error':
        return 'bg-red-900/90 border-red-700'
      case 'info':
        return 'bg-blue-900/90 border-blue-700'
    }
  }

  return (
    <div className={`${getBgColor()} border rounded-lg p-4 shadow-lg backdrop-blur-sm animate-in slide-in-from-right duration-300`}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-white">{title}</h4>
          <p className="text-sm text-gray-300 mt-1">{message}</p>
        </div>
        <button
          onClick={() => onClose(id)}
          className="flex-shrink-0 text-gray-400 hover:text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

export default Notification