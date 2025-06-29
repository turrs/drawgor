import { useState, useCallback } from 'react'
import { NotificationProps } from '../components/Notification'

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<NotificationProps[]>([])

  const addNotification = useCallback((
    type: 'success' | 'error' | 'info',
    title: string,
    message: string,
    duration?: number
  ) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9)
    const notification: NotificationProps = {
      id,
      type,
      title,
      message,
      duration,
      onClose: () => {}
    }

    setNotifications(prev => [...prev, notification])
  }, [])

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  const showSuccess = useCallback((title: string, message: string, duration?: number) => {
    addNotification('success', title, message, duration)
  }, [addNotification])

  const showError = useCallback((title: string, message: string, duration?: number) => {
    addNotification('error', title, message, duration || 8000) // Longer duration for errors
  }, [addNotification])

  const showInfo = useCallback((title: string, message: string, duration?: number) => {
    addNotification('info', title, message, duration)
  }, [addNotification])

  return {
    notifications,
    removeNotification,
    showSuccess,
    showError,
    showInfo
  }
}