import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export function useRealtimeData(socket) {
  const [realtimeData, setRealtimeData] = useState({
    candles: [],
    price: null,
    prevClose: null,
    lastUpdate: null
  });
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const symbolRef = useRef(null);
  
  // Monitor socket connection
  useEffect(() => {
    if (!socket) {
      console.log('⏳ Waiting for socket connection...');
      return;
    }
    
    console.log('📡 Socket available, setting up listeners');
    
    const onConnect = () => {
      console.log('✅ Socket connected');
      setIsConnected(true);
      setIsLoading(false);
      
      // Resubscribe if we have a symbol
      if (symbolRef.current) {
        socket.emit('subscribe', { symbol: symbolRef.current });
      }
    };
    
    const onDisconnect = () => {
      console.log('⚠️ Socket disconnected');
      setIsConnected(false);
    };
    
    const onTick = (tick) => {
      console.log(`📊 Tick received: ₹${tick.last_price}`);
      setRealtimeData(prev => ({
        ...prev,
        price: tick.last_price,
        timestamp: tick.timestamp || Date.now(),
        lastUpdate: new Date().toISOString()
      }));
    };
    
    const onCandle = ({ symbol, candle }) => {
      console.log(`🕯️ Candle received for ${symbol}`);
      setRealtimeData(prev => ({
        ...prev,
        candles: [...(prev.candles || []).slice(-199), candle],
        price: candle.c,
        lastUpdate: new Date().toISOString()
      }));
    };
    
    // Set up listeners
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('tick', onTick);
    socket.on('candle', onCandle);
    
    // Check initial connection
    if (socket.connected) {
      onConnect();
    }
    
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('tick', onTick);
      socket.off('candle', onCandle);
    };
  }, [socket]);
  
 const subscribeToSymbol = useCallback(async (symbol, tf = '5') => {
  console.log(`📊 Subscribing to ${symbol} with ${tf}m timeframe`);
  symbolRef.current = symbol;
  
  if (socket && socket.connected) {
    socket.emit('subscribe', { symbol, timeframe: tf });
  }
  
  setIsLoading(true);
  
  try {
    const res = await axios.get(`${API_BASE}/papertrade/candles/${encodeURIComponent(symbol)}?timeframe=${tf}`);
    if (res.data.success) {
      console.log(`✅ Loaded ${res.data.candles?.length || 0} ${tf}m candles`);
      setRealtimeData(prev => ({
        ...prev,
        candles: res.data.candles || [],
        price: res.data.currentPrice,
        lastUpdate: new Date().toISOString(),
        timeframe: tf
      }));
    }
  } catch (error) {
    console.error('❌ Error fetching candles:', error);
  } finally {
    setIsLoading(false);
  }
}, [socket]);
  
  // Simulate price updates if connection is lost (fallback)
  useEffect(() => {
    if (isConnected || !realtimeData.price) return;
    
    // If disconnected for more than 10 seconds, show warning
    const timeout = setTimeout(() => {
      console.log('⚠️ No live data connection - showing last known price');
    }, 10000);
    
    return () => clearTimeout(timeout);
  }, [isConnected, realtimeData.price]);
  
  return { 
    realtimeData, 
    isConnected, 
    isLoading,
    subscribeToSymbol 
  };
}