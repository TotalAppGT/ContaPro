import React, { useState } from 'react';
import { X, HelpCircle } from 'lucide-react';

interface Props {
  tips: string[];
  title?: string;
}

export default function HelpBar({ tips, title }: Props) {
  const [show, setShow] = useState(() => {
    const hidden = localStorage.getItem('contapro_help_hidden');
    return !hidden;
  });

  if (!show || tips.length === 0) return null;

  const dismiss = () => {
    localStorage.setItem('contapro_help_hidden', '1');
    setShow(false);
  };

  return (
    <div style={{ background: 'linear-gradient(135deg, #eff6ff, #f0f9ff)', border: '1px solid #bfdbfe', borderRadius: 12, padding: '14px 18px', position: 'relative', marginBottom: 16 }}>
      <button onClick={dismiss} style={{ position: 'absolute', right: 12, top: 12, background: 'none', border: 'none', cursor: 'pointer', color: '#93c5fd' }}>
        <X size={16} />
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <HelpCircle size={16} style={{ color: '#3b82f6' }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: '#1e40af' }}>{title || 'Sugerencias'}</span>
      </div>
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {tips.map((t, i) => (
          <li key={i} style={{ fontSize: 12, color: '#475569', marginBottom: 3, lineHeight: 1.5 }}>{t}</li>
        ))}
      </ul>
    </div>
  );
}
