import { useState, useEffect } from "react";

export function useActiveEvent(eventInfo: any) {
  const [activeEvent, setActiveEvent] = useState<any>(null);

  useEffect(() => {
    if (!eventInfo) {
      setActiveEvent(null);
      return;
    }

    const calculateActiveEvent = () => {
      let eventsArray = [];
      if (eventInfo.events && Array.isArray(eventInfo.events)) {
        eventsArray = eventInfo.events;
      } else if (eventInfo.description || eventInfo.date || eventInfo.startDate) {
        // Fallback for legacy single event data
        eventsArray = [eventInfo];
      }

      if (eventsArray.length === 0) {
        return null;
      }

      const active = eventsArray
        .filter(e => e.enabled !== false)
        .filter(e => {
            const end = e.endDate || e.date;
            if (!end) return false;
            return new Date(end).getTime() > Date.now();
        })
        .sort((a, b) => {
            const timeA = new Date(a.startDate || a.date || a.endDate || 0).getTime();
            const timeB = new Date(b.startDate || b.date || b.endDate || 0).getTime();
            return timeA - timeB;
        });
      
      return active.length > 0 ? active[0] : null;
    };

    // Calculate immediately
    setActiveEvent(calculateActiveEvent());

    // Recalculate every second to automatically drop expired events
    const interval = setInterval(() => {
      setActiveEvent(calculateActiveEvent());
    }, 1000);

    return () => clearInterval(interval);
  }, [eventInfo]);

  return activeEvent;
}
