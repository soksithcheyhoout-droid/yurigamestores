import React, { useState, useEffect } from 'react';
import { ShieldCheck, Activity } from 'lucide-react';
import { INITIAL_TRANSACTIONS } from '../data/mockTransactions';

export default function LiveTransactions() {
  const [transactions, setTransactions] = useState(INITIAL_TRANSACTIONS);

  // Periodically add a new simulated transaction to keep the feed dynamic
  useEffect(() => {
    const gamesList = [
      { game: "Mobile Legends KH", products: ["86 Diamonds", "Weekly Pass", "257 Diamonds"], price: [1.48, 1.81, 4.18] },
      { game: "Free Fire", products: ["100 Diamonds", "520 Diamonds", "Weekly Membership"], price: [0.95, 4.65, 1.90] },
      { game: "PUBG Mobile", products: ["60 UC", "660 UC", "325 UC"], price: [0.95, 9.40, 4.75] },
      { game: "Genshin Impact", products: ["Welkin Moon", "300 Genesis Crystals"], price: [4.80, 4.75] },
      { game: "Honor of Kings", products: ["80+8 Tokens", "240+17 Tokens"], price: [1.35, 3.90] }
    ];

    const interval = setInterval(() => {
      const randomGame = gamesList[Math.floor(Math.random() * gamesList.length)];
      const itemIdx = Math.floor(Math.random() * randomGame.products.length);
      const randomPlayer = `${Math.floor(100 + Math.random() * 899)}***${Math.floor(10 + Math.random() * 89)}`;

      const newTx = {
        id: `TDB-${Math.floor(9022 + Math.random() * 1000)}`,
        game: randomGame.game,
        product: randomGame.products[itemIdx],
        amount: randomGame.price[itemIdx],
        status: "Delivered",
        time: "Just now",
        player: randomPlayer,
        server: "Auto"
      };

      setTransactions(prev => [newTx, ...prev.slice(0, 15)]);
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      borderBottom: '1px solid #e2e8f0',
      backgroundColor: '#f8fafc',
      padding: '0.65rem 0',
      overflow: 'hidden'
    }}>
      <div className="container" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem'
      }}>
        {/* Live Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.45rem',
          flexShrink: 0,
          background: '#dcfce7',
          border: '1px solid #bbf7d0',
          borderRadius: 'var(--radius-full)',
          padding: '0.25rem 0.75rem',
          fontSize: '0.75rem',
          fontWeight: 700,
          color: '#15803d',
          fontFamily: 'var(--font-gaming)'
        }}>
          <Activity size={13} className="pulse-dot" />
          <span>LIVE ORDERS</span>
        </div>

        {/* Scrolling Ticker */}
        <div className="marquee-container" style={{ flex: 1 }}>
          <div className="marquee-content">
            {transactions.concat(transactions).map((tx, idx) => (
              <div
                key={`${tx.id}-${idx}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.35rem 0.85rem',
                  fontSize: '0.82rem',
                  boxShadow: '0 1px 4px rgba(15, 23, 42, 0.04)'
                }}
              >
                <ShieldCheck size={14} color="#059669" />
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{tx.game}</span>
                <span style={{ color: '#0284c7', fontWeight: 600 }}>{tx.product}</span>
                <span className="mono" style={{ color: '#64748b', fontSize: '0.78rem' }}>{tx.player}</span>
                <span className="badge badge-green" style={{ fontSize: '0.68rem', padding: '0.1rem 0.4rem' }}>${tx.amount.toFixed(2)}</span>
                <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>• {tx.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
