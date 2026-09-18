/**
 * ColumnHeader 컴포넌트 테스트 (TDD Red)
 *
 * 스펙: docs/FRONTEND_TASKS.md Phase 4.2, docs/TEST_CASES.md TC-COMP-002
 * C002-3(칼럼 헤더: 칼럼명 + 티켓 수 표시), docs/COMPONENT_SPEC.md §2.5
 * Column 스펙의 "칼럼 헤더에 칼럼명 + 티켓 수 뱃지 표시" 요구사항을 분리한
 * 소형 컴포넌트.
 *
 * 대상: src/client/components/board/ColumnHeader.tsx (아직 미구현)
 */

import { render, screen } from '@testing-library/react';
import { ColumnHeader } from '../../src/client/components/board/ColumnHeader';

describe('ColumnHeader', () => {
  it('label(칼럼명) prop이 렌더된다', () => {
    render(<ColumnHeader label="TODO" count={3} />);
    expect(screen.getByText('TODO')).toBeInTheDocument();
  });

  it('count(티켓 수) prop이 숫자로 렌더된다', () => {
    render(<ColumnHeader label="TODO" count={3} />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('count는 뱃지 형태(rounded-badge 클래스)로 렌더된다', () => {
    render(<ColumnHeader label="TODO" count={3} />);
    expect(screen.getByText('3')).toHaveClass('rounded-badge');
  });

  it('count=0이어도 "0"이 렌더된다 (빈 칼럼도 카운트 표시)', () => {
    render(<ColumnHeader label="DONE" count={0} />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });
});
