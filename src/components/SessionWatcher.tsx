'use client';

import { useEffect, useState, useRef } from 'react';
import { signOut } from 'next-auth/react';

export default function SessionWatcher() {
  const [showKickedModal, setShowKickedModal] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState('');
  const sessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    // Register this session as active and store the unique ID
    async function register() {
      try {
        const res = await fetch('/api/auth/register-session', { method: 'POST' });
        const data = await res.json();
        if (data.sessionId) {
          sessionIdRef.current = data.sessionId;
          // Store in sessionStorage so it persists during navigation
          sessionStorage.setItem('dart_session_id', data.sessionId);
          console.log('✅ Session registered:', data.sessionId.substring(0, 30));
        }
      } catch (e) {
        console.error('Register failed:', e);
      }
    }

    // Get existing session ID or register new one
    const existingId = sessionStorage.getItem('dart_session_id');
    if (existingId) {
      sessionIdRef.current = existingId;
    } else {
      register();
    }

    // Check session every 10 seconds
    intervalId = setInterval(async () => {
      try {
        const headers: any = {};
        if (sessionIdRef.current) {
          headers['x-session-id'] = sessionIdRef.current;
        }

        const res = await fetch('/api/auth/check-session', { headers });
        const data = await res.json();
        
// Only register if WE haven't registered yet
        if (data.needsRegister && !sessionIdRef.current) {
          await register();
          return;
        }

        if (!data.valid && data.reason === 'logged_in_elsewhere') {
          setDeviceInfo(data.device || 'another device');
          setShowKickedModal(true);
          clearInterval(intervalId);
          sessionStorage.removeItem('dart_session_id');
          
          // Auto sign out after 5 seconds
          setTimeout(() => {
            signOut({ callbackUrl: '/login' });
          }, 5000);
        }
      } catch (e) {
        console.error('Session check failed:', e);
      }
    }, 10000);

    return () => clearInterval(intervalId);
  }, []);

  if (!showKickedModal) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.85)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      backdropFilter: 'blur(8px)'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '32px',
        maxWidth: '420px',
        textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
        <h2 style={{ 
          fontSize: '22px', 
          fontWeight: 'bold', 
          marginBottom: '12px',
          color: '#dc2626'
        }}>
          Logged In on Another Device
        </h2>
        <p style={{ 
          fontSize: '14px', 
          color: '#666', 
          marginBottom: '20px',
          lineHeight: '1.6'
        }}>
          Your account has been logged in on another device. For security reasons, 
          this session will be terminated. You will be redirected to the login page in 5 seconds.
        </p>
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          padding: '12px',
          borderRadius: '8px',
          fontSize: '12px',
          color: '#991b1b',
          marginBottom: '20px'
        }}>
          ⚠️ Only one device can be logged in at a time
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          style={{
            background: '#dc2626',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
            width: '100%'
          }}
        >
          Logout Now
        </button>
      </div>
    </div>
  );
}