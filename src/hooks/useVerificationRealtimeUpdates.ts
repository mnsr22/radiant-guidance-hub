import { useEffect, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';

interface VerificationUpdateEvent {
  userId: string;
  type: 'phone' | 'identity';
  status: string;
  timestamp: string;
}

interface NotificationEvent {
  userId: string;
  type: string;
  message: string;
  timestamp: string;
}

export function useVerificationRealtimeUpdates(
  onVerificationUpdate?: (event: VerificationUpdateEvent) => void,
  onNotificationNew?: (event: NotificationEvent) => void
) {
  const socketRef = useCallback(() => {
    const socket: Socket = io(process.env.VITE_API_URL || 'http://localhost:3000', {
      auth: {
        token: localStorage.getItem('adminToken'),
      },
    });

    socket.on('connect', () => {
      console.log('Verification realtime connected');
      // Subscribe to verification updates
      socket.emit('subscribe', 'verification:updated');
      socket.emit('subscribe', 'notification:new');
    });

    socket.on('verification:updated', (event: VerificationUpdateEvent) => {
      console.log('Verification updated:', event);
      onVerificationUpdate?.(event);
    });

    socket.on('notification:new', (event: NotificationEvent) => {
      console.log('New notification:', event);
      onNotificationNew?.(event);
    });

    socket.on('disconnect', () => {
      console.log('Verification realtime disconnected');
    });

    return socket;
  }, [onVerificationUpdate, onNotificationNew]);

  useEffect(() => {
    const socket = socketRef();

    return () => {
      socket.disconnect();
    };
  }, [socketRef]);
}
