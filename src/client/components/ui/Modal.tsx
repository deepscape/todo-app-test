// docs/COMPONENT_SPEC.md §3 Modal. 오버레이+중앙 정렬, ESC/바깥 클릭
// 닫기, body 스크롤 잠금. app/globals.css --color-overlay,
// --shadow-modal 토큰을 사용한다.
//
// Web Interface Guidelines: 오버레이가 포커스된 요소를 가려서는 안
// 된다 — 모달이 열리면 포커스를 다이얼로그 내부로 옮기고, Tab으로
// 배경 콘텐츠를 순회할 수 없도록 포커스를 트랩한다. 닫히면 모달을
// 열었던 요소로 포커스를 되돌린다.
'use client';

import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({ isOpen, onClose, children }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;

    // 다이얼로그 안의 첫 포커스 가능 요소로 이동한다. 없으면 다이얼로그
    // 컨테이너 자체(tabIndex=-1)로 옮겨 최소한 배경에서는 벗어나게 한다.
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      FOCUSABLE_SELECTOR
    );
    (focusable?.[0] ?? dialogRef.current)?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (e.key !== 'Tab' || !dialogRef.current) return;

      const focusableEls = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      );
      if (focusableEls.length === 0) {
        e.preventDefault();
        return;
      }

      const first = focusableEls[0];
      const last = focusableEls[focusableEls.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocusedRef.current?.focus();
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
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className="shadow-modal rounded-card bg-card-bg max-h-[90vh] max-w-lg overflow-y-auto p-6 transition-transform focus:outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
