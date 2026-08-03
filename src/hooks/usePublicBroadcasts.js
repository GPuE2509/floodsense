import { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';

export const usePublicBroadcasts = () => {
  const [broadcasts, setBroadcasts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchBroadcasts = async () => {
    try {
      const res = await apiService.get('/notifications/public/broadcasts');
      if (res.success) {
        setBroadcasts(res.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch public broadcasts', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBroadcasts();

    const handleNewNotification = () => {
      // We listen to unread-count-changed which is dispatched by WebSocket when any new notification arrives
      fetchBroadcasts();
    };

    window.addEventListener('unread-count-changed', handleNewNotification);
    
    return () => {
      window.removeEventListener('unread-count-changed', handleNewNotification);
    };
  }, []);

  const formatBroadcastToTicker = (broadcast) => {
    const time = new Date(broadcast.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const prefix = broadcast.type === 'Admin_Announcement' ? '[ANNOUNCEMENT]' : '[UPDATE]';
    const sender = broadcast.sender_name || 'System';
    return `${time} ${prefix} ${sender}: ${broadcast.title} - ${broadcast.body}`;
  };

  const tickerItems = broadcasts.length > 0 
    ? [formatBroadcastToTicker(broadcasts[0])]
    : ["No new system notifications at this time."];

  return { broadcasts, tickerItems, loading, refresh: fetchBroadcasts };
};
