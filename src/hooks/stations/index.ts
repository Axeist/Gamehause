
// This file exports the useStations hook
import { useSessionsData } from './useSessionsData';
import { useStationsData } from './useStationsData';
import { useSessionActions } from './session-actions';
import { Station, Session, Customer } from '@/types/pos.types';
import { useState, useEffect } from 'react';

export const useStations = (initialStations: Station[] = [], updateCustomer: (customer: Customer) => void) => {
  const { 
    stations, 
    setStations,
    stationsLoading,
    stationsError,
    refreshStations,
    deleteStation,
    updateStation,
    updateStationImage
  } = useStationsData();
  
  const {
    sessions,
    setSessions,
    sessionsLoading,
    sessionsError,
    refreshSessions
  } = useSessionsData();
  
  // Connect active sessions to stations
  useEffect(() => {
    if (stations.length > 0 && sessions.length >= 0) {
      console.log("Connecting active sessions to stations");
      
      // Find active sessions (without endTime) if sessions exist
      const activeSessions = sessions.filter(s => !s.endTime);
      
      console.log(`Found ${activeSessions.length} active sessions to connect, out of ${sessions.length} total sessions`);
      
      // Create a mapping of station ID to session
      const activeSessionMap = new Map<string, Session>();
      activeSessions.forEach(session => {
        activeSessionMap.set(session.stationId, session);
      });
      
      // Update stations with their active sessions
      setStations(prev => prev.map(station => {
        const activeSession = activeSessionMap.get(station.id);
        
        if (activeSession) {
          console.log(`Connecting session to station ${station.name}`);
          return {
            ...station,
            isOccupied: true,
            currentSession: activeSession
          };
        } else {
          // If there's no active session for this station, ensure it's marked as unoccupied
          return {
            ...station,
            isOccupied: false,
            currentSession: null
          };
        }
      }));
    }
  }, [sessions, stations.length]);
  
  const {
    startSession,
    endSession,
    isLoading
  } = useSessionActions({
    stations,
    setStations,
    sessions,
    setSessions,
    updateCustomer
  });

  return {
    stations,
    setStations,
    sessions,
    setSessions,
    startSession,
    endSession,
    deleteStation,
    updateStation,
    updateStationImage,
    stationsLoading,
    stationsError,
    sessionsLoading,
    sessionsError,
    refreshStations,
    refreshSessions,
    isLoading
  };
};

export { useSessionsData } from './useSessionsData';
export { useStationsData } from './useStationsData';
export { useSessionActions } from './session-actions';
