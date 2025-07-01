import React from 'react'
import Notification, { NotificationProps } from './Notification'

interface NotificationContainerProps {
  notifications: NotificationProps[]
  onClose: (id: string) => void
}

const NotificationContainer: React.FC<NotificationContainerProps> = ({
  notifications,
  onClose
}) => {
  if (notifications.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full">
      {notifications.map((notification) => (
        <Notification
          key={notification.id}
          {...notification}
          onClose={onClose}
        />
      ))}
    </div>
  )
}

export default NotificationContainer