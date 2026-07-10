import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface PinModalProps {
  open: boolean;
  correctPin: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function PinModal({ open, correctPin, onSuccess, onCancel }: PinModalProps) {
  const { t } = useTranslation();
  const [digits, setDigits] = useState(['', '', '', '']);
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null)
  ];

  useEffect(() => {
    if (open) {
      setDigits(['', '', '', '']);
      setError(false);
      setShake(false);
      setTimeout(() => inputRefs[0].current?.focus(), 100);
    }
  }, [open]);

  if (!open) return null;

  const handleDigitChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // Only digits

    const newDigits = [...digits];
    newDigits[index] = value.slice(-1); // Keep only last digit
    setDigits(newDigits);
    setError(false);

    // Auto-advance to next input
    if (value && index < 3) {
      inputRefs[index + 1].current?.focus();
    }

    // Auto-submit when all 4 digits are entered
    if (value && index === 3) {
      const pin = newDigits.join('');
      if (pin.length === 4) {
        setTimeout(() => {
          if (pin === correctPin) {
            setDigits(['', '', '', '']);
            onSuccess();
          } else {
            setError(true);
            setShake(true);
            setTimeout(() => {
              setShake(false);
              setDigits(['', '', '', '']);
              inputRefs[0].current?.focus();
            }, 600);
          }
        }, 150);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
    if (e.key === 'Escape') {
      setDigits(['', '', '', '']);
      setError(false);
      onCancel();
    }
  };

  return (
    <div className="modal-backdrop" style={{ zIndex: 100 }} onClick={() => { setDigits(['', '', '', '']); setError(false); onCancel(); }}>
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 100%)',
          borderRadius: '20px',
          border: '1px solid rgba(255,255,255,0.1)',
          padding: '40px 36px',
          textAlign: 'center',
          maxWidth: '340px',
          width: '100%',
          boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
        }}
      >
        {/* Lock Icon */}
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(76, 201, 240, 0.15), rgba(76, 201, 240, 0.05))',
          border: '1px solid rgba(76, 201, 240, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4cc9f0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
        </div>

        <h2 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 700 }}>
          {t('parental.pinRequired')}
        </h2>
        <p style={{ fontSize: '14px', color: '#94a3b8', margin: '0 0 28px' }}>
          {t('parental.enterPin')}
        </p>

        {/* PIN Input Boxes */}
        <div 
          style={{ 
            display: 'flex', 
            gap: '12px', 
            justifyContent: 'center', 
            marginBottom: '24px',
            animation: shake ? 'shake 0.5s ease-in-out' : undefined
          }}
        >
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={inputRefs[i]}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleDigitChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              style={{
                width: '52px',
                height: '60px',
                fontSize: '24px',
                textAlign: 'center',
                borderRadius: '12px',
                border: `2px solid ${error ? '#ef4444' : digit ? '#4cc9f0' : 'rgba(255,255,255,0.12)'}`,
                background: error ? 'rgba(239, 68, 68, 0.08)' : 'rgba(255,255,255,0.04)',
                color: '#f8fafc',
                outline: 'none',
                transition: 'all 0.2s ease',
                caretColor: '#4cc9f0',
              }}
              onFocus={(e) => {
                if (!error) e.currentTarget.style.borderColor = '#4cc9f0';
                e.currentTarget.style.background = 'rgba(76, 201, 240, 0.06)';
              }}
              onBlur={(e) => {
                if (!error && !digit) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
                if (!digit) e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
              }}
            />
          ))}
        </div>

        {/* Error message */}
        {error && (
          <p style={{ 
            color: '#ef4444', 
            margin: '0 0 20px', 
            fontSize: '13px', 
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            {t('parental.incorrectPin')}
          </p>
        )}

        <button 
          className="ghost-button" 
          onClick={() => { setDigits(['', '', '', '']); setError(false); onCancel(); }}
          style={{ padding: '10px 28px', fontSize: '14px' }}
        >
          {t('common.cancel')}
        </button>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-6px); }
          20%, 40%, 60%, 80% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
}
