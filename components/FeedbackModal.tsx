'use client';

import { useState, useRef, useEffect } from 'react';

interface FeedbackModalProps {
  open: boolean;
  onClose: () => void;
  page?: string;
  gameId?: string;
}

export default function FeedbackModal({ open, onClose, page, gameId }: FeedbackModalProps) {
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setMessage('');
      setStatus('idle');
      // Focus textarea after animation
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [open]);

  if (!open) return null;

  async function handleSubmit() {
    if (!message.trim()) return;
    setStatus('sending');
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, page, gameId }),
      });
      if (!res.ok) throw new Error();
      setStatus('sent');
      setTimeout(onClose, 1200);
    } catch {
      setStatus('error');
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center" onClick={onClose}>
      <div className="fixed inset-0 bg-black/40" />
      <div
        className="relative w-full max-w-md mx-4 bg-white rounded-2xl shadow-xl p-5 animate-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-bold text-gray-700 mb-3">Something look wrong?</h3>

        {status === 'sent' ? (
          <p className="text-sm text-green-600 py-4 text-center">Thanks for the feedback!</p>
        ) : (
          <>
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe what looks off..."
              maxLength={2000}
              rows={4}
              className="w-full border border-gray-200 rounded-lg p-3 text-sm text-gray-700 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
            />

            {status === 'error' && (
              <p className="text-xs text-red-500 mt-1">Failed to send. Try again.</p>
            )}

            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!message.trim() || status === 'sending'}
                className="px-4 py-2 text-sm font-semibold text-white bg-accent rounded-lg hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {status === 'sending' ? 'Sending...' : 'Submit'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
