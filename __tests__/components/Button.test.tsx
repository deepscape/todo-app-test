/**
 * Button 컴포넌트 테스트 (TDD Red)
 *
 * 스펙: docs/COMPONENT_SPEC.md §3 Button, docs/FRONTEND_TASK.md Phase 1.2
 * 대상: src/client/components/ui/Button.tsx (아직 미구현)
 *
 * variant 4종(primary/secondary/danger/ghost) × size 3종(sm/md/lg),
 * 기본값(variant=primary, size=md), onClick, isLoading(비활성화 +
 * "처리중 ..." 표시 + 클릭 무시), children 렌더링을 검증한다.
 *
 * 색상 클래스는 app/globals.css에 정의된 토큰(--color-brand,
 * --color-neutral, --color-danger 등)을 사용하는 Tailwind 유틸리티
 * 클래스명(bg-brand, bg-neutral, bg-danger, text-brand 등)을 기준으로
 * 검증한다.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../../src/client/components/ui/Button';

describe('Button', () => {
  describe('children 렌더링', () => {
    it('전달한 children이 그대로 렌더된다', () => {
      render(<Button>저장</Button>);
      expect(screen.getByText('저장')).toBeInTheDocument();
    });
  });

  describe('variant별 CSS 클래스', () => {
    it('variant="primary" → bg-brand 클래스를 포함한다', () => {
      render(<Button variant="primary">확인</Button>);
      expect(screen.getByRole('button')).toHaveClass('bg-brand');
    });

    it('variant="secondary" → bg-neutral 클래스를 포함한다', () => {
      render(<Button variant="secondary">취소</Button>);
      expect(screen.getByRole('button')).toHaveClass('bg-neutral');
    });

    it('variant="secondary" → 테두리(border-neutral-border)를 포함한다 (board 배경과 동색이라 구분 필요)', () => {
      render(<Button variant="secondary">취소</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('border');
      expect(button).toHaveClass('border-neutral-border');
    });

    it('variant="danger" → bg-danger 클래스를 포함한다', () => {
      render(<Button variant="danger">삭제</Button>);
      expect(screen.getByRole('button')).toHaveClass('bg-danger');
    });

    it('variant="ghost" → 배경이 투명(bg-transparent)하고 브랜드 텍스트 색상을 포함한다', () => {
      render(<Button variant="ghost">더보기</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-transparent');
      expect(button).toHaveClass('text-brand');
    });
  });

  describe('size별 CSS 클래스', () => {
    it('size="sm" → 가장 좁은 패딩(px-3)을 포함한다', () => {
      render(<Button size="sm">작게</Button>);
      expect(screen.getByRole('button')).toHaveClass('px-3');
    });

    it('size="md" → 중간 패딩(px-4)을 포함한다', () => {
      render(<Button size="md">보통</Button>);
      expect(screen.getByRole('button')).toHaveClass('px-4');
    });

    it('size="lg" → 가장 넓은 패딩(px-5)과 text-base를 포함한다', () => {
      render(<Button size="lg">크게</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-5');
      expect(button).toHaveClass('text-base');
    });
  });

  describe('기본값', () => {
    it('variant를 지정하지 않으면 primary(bg-brand)가 적용된다', () => {
      render(<Button>기본</Button>);
      expect(screen.getByRole('button')).toHaveClass('bg-brand');
    });

    it('size를 지정하지 않으면 md(px-4)가 적용된다', () => {
      render(<Button>기본</Button>);
      expect(screen.getByRole('button')).toHaveClass('px-4');
    });
  });

  describe('onClick 핸들러', () => {
    it('클릭하면 onClick이 1회 호출된다', async () => {
      const user = userEvent.setup();
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>클릭</Button>);

      await user.click(screen.getByRole('button'));

      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('isLoading', () => {
    it('isLoading=true면 버튼이 비활성화된다', () => {
      render(<Button isLoading>저장</Button>);
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('isLoading=true면 "처리중 ..." 텍스트가 표시된다', () => {
      render(<Button isLoading>저장</Button>);
      expect(screen.getByText('처리중 ...')).toBeInTheDocument();
    });

    it('isLoading=false(기본값)면 "처리중 ..." 텍스트가 없다', () => {
      render(<Button>저장</Button>);
      expect(screen.queryByText('처리중 ...')).not.toBeInTheDocument();
    });

    it('isLoading=true일 때 클릭해도 onClick이 호출되지 않는다', async () => {
      const user = userEvent.setup();
      const handleClick = jest.fn();
      render(
        <Button isLoading onClick={handleClick}>
          저장
        </Button>
      );

      await user.click(screen.getByRole('button'));

      expect(handleClick).not.toHaveBeenCalled();
    });
  });
});
