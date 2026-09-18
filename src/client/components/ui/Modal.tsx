// docs/COMPONENT_SPEC.md §3 Modal. 오버레이+중앙 정렬, ESC/바깥 클릭
// 닫기, body 스크롤 잠금. app/globals.css --color-overlay,
// --shadow-modal 토큰을 사용한다.
'use client';

import { useEffect } from 'react';
import type { ReactNode } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ isOpen, onClose, children }: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      data-testid="modal-overlay"
      className="bg-overlay fixed inset-0 z-50 flex items-center justify-center transition-opacity"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="shadow-modal rounded-card bg-card-bg max-h-[90vh] max-w-lg overflow-y-auto p-6 transition-transform"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
