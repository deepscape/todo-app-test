// docs/COMPONENT_SPEC.md §3 Button. app/globals.css 토큰 기반 Tailwind
// 유틸리티로 스타일링한다(컴포넌트 레벨 클래스는 globals.css에 두지
// 않는다 — docs/FRONTEND_TASK.md Phase 1 설계 방향).
import type { ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-text-inverse hover:bg-brand-hover',
  // board 배경(--color-board-bg)과 neutral 배경이 같은 색이라 테두리로
  // 구분한다 — 색만으로는 버튼이 배경에 묻혀 보이지 않는다.
  secondary:
    'bg-neutral text-text-primary border border-neutral-border hover:bg-neutral-hover',
  danger: 'bg-danger text-text-inverse hover:bg-danger-hover',
  ghost: 'bg-transparent text-brand hover:bg-brand-subtle',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'text-sm px-3 py-1.5',
  md: 'text-sm px-4 py-2',
  lg: 'text-base px-5 py-2.5',
};

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  onClick,
  children,
  className,
  ...rest
}: ButtonProps) {
  const classes = [
    'rounded-control',
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      className={classes}
      disabled={disabled || isLoading}
      onClick={isLoading ? undefined : onClick}
      {...rest}
    >
      {isLoading ? '처리중 ...' : children}
    </button>
  );
}
