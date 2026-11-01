import React, { useState, useEffect } from 'react';
import { Database, CheckCircle2, AlertCircle, RefreshCw, Server } from 'lucide-react';
import { checkDbHealth } from '../data/orderStore';

export default function DatabaseStatusBadge({ className = '' }) {
  const [dbState, setDbState] = useState({
    status: 'checking',
    mysql: 'connecting',
    database: 'cheydev_topup_db',
    latency: '...',
    serverTime: null
  });
  const [isOpen, setIsOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchStatus = async () => {
    setIsRefreshing(true);
    const data = await checkDbHealth();
    setDbState(data);
    setIsRefreshing(false);
  };

  useEffect(() => {
    fetchStatus();
    // Poll status periodically every 30 seconds
    const timer = setInterval(fetchStatus, 30000);
    return () => clearInterval(timer);
  }, []);

  const isConnected = dbState.mysql === 'connected';

  return (
    <div className={`relative inline-block text-left ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="MySQL Database Connection Status"
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all border shadow-2xs cursor-pointer ${
          isConnected
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
            : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
        }`}
      >
        <span className="relative flex h-2 w-2">
          {isConnected && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          )}
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${
              isConnected ? 'bg-emerald-500' : 'bg-amber-500'
            }`}
          ></span>
        </span>
        <Database size={12} className={isConnected ? 'text-emerald-600' : 'text-amber-600'} />
        <span className="hidden sm:inline">MySQL:</span>
        <span className="font-bold">{isConnected ? 'Connected' : 'Offline / Local'}</span>
        {isConnected && dbState.latency && (
          <span className="text-[10px] opacity-75 font-mono">({dbState.latency})</span>
        )}
      </button>

      {/* Popover Card */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 rounded-xl bg-white shadow-xl border border-slate-200 p-3.5 z-50 text-slate-800 text-xs animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
            <div className="flex items-center gap-1.5 font-bold text-slate-900">
              <Server size={14} className="text-[#E3062F]" />
              <span>MySQL Database Info</span>
            </div>
            <button
              onClick={fetchStatus}
              disabled={isRefreshing}
              className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100 transition-colors"
              title="Refresh connection"
            >
              <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between py-1 px-2 rounded bg-slate-50">
              <span className="text-slate-500">Status:</span>
              <span className="flex items-center gap-1 font-semibold">
                {isConnected ? (
                  <>
                    <CheckCircle2 size={12} className="text-emerald-500" />
                    <span className="text-emerald-600">Online & Active</span>
                  </>
                ) : (
                  <>
                    <AlertCircle size={12} className="text-amber-500" />
                    <span className="text-amber-600">Local Fallback</span>
                  </>
                )}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 px-2 rounded">
              <span className="text-slate-500">Database:</span>
              <span className="font-mono font-semibold text-slate-800">
                {dbState.database || 'cheydev_topup_db'}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 px-2 rounded bg-slate-50">
              <span className="text-slate-500">Host / Engine:</span>
              <span className="font-mono text-slate-700">localhost:3306 (InnoDB)</span>
            </div>

            <div className="flex items-center justify-between py-1 px-2 rounded">
              <span className="text-slate-500">Active Tables:</span>
              <span className="font-semibold text-slate-800 text-[10px]">users, orders, diamond_stock, stock_history</span>
            </div>

            {dbState.latency && (
              <div className="flex items-center justify-between py-1 px-2 rounded bg-slate-50">
                <span className="text-slate-500">Query Ping:</span>
                <span className="font-mono text-emerald-600 font-semibold">{dbState.latency}</span>
              </div>
            )}
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between">
            <span>YuriGame TopUp MySQL Bridge</span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
