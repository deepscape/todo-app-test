/**
 * ConfirmDialog 컴포넌트 테스트 (TDD Red)
 *
 * 스펙: docs/FRONTEND_TASKS.md Phase 2.2, docs/COMPONENT_SPEC.md §3
 * ConfirmDialog — "정말 삭제하시겠습니까?" 확인 다이얼로그, 확인/취소
 * 버튼, 위험 동작은 빨간색 확인 버튼(Button variant="danger"). Modal을
 * 내부적으로 사용한다.
 *
 * 대상: src/client/components/ui/ConfirmDialog.tsx (아직 미구현)
 *
 * 5개 테스트: 메시지 표시, 확인→onConfirm, 취소→onCancel(+onConfirm
 * 미호출), 확인 버튼이 danger variant인지, isOpen 전달.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from '../../src/client/components/ui/ConfirmDialog';

describe('ConfirmDialog', () => {
  it('message prop이 그대로 렌더된다', () => {
    render(
      <ConfirmDialog
        isOpen
        message="정말 삭제하시겠습니까?"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />
    );
    expect(screen.getByText('정말 삭제하시겠습니까?')).toBeInTheDocument();
  });

  it('"확인" 버튼 클릭 시 onConfirm이 호출된다', async () => {
    const user = userEvent.setup();
    const handleConfirm = jest.fn();
    render(
      <ConfirmDialog
        isOpen
        message="정말 삭제하시겠습니까?"
        onConfirm={handleConfirm}
        onCancel={jest.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: '확인' }));

    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  it('"취소" 버튼 클릭 시 onCancel이 호출되고 onConfirm은 호출되지 않는다', async () => {
    const user = userEvent.setup();
    const handleConfirm = jest.fn();
    const handleCancel = jest.fn();
    render(
      <ConfirmDialog
        isOpen
        message="정말 삭제하시겠습니까?"
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    );

    await user.click(screen.getByRole('button', { name: '취소' }));

    expect(handleCancel).toHaveBeenCalledTimes(1);
    expect(handleConfirm).not.toHaveBeenCalled();
  });

  it('확인 버튼은 danger variant(bg-danger 클래스)로 렌더된다', () => {
    render(
      <ConfirmDialog
        isOpen
        message="정말 삭제하시겠습니까?"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />
    );
    expect(screen.getByRole('button', { name: '확인' })).toHaveClass(
      'bg-danger'
    );
  });

  it('isOpen=false면 다이얼로그를 렌더하지 않는다', () => {
    render(
      <ConfirmDialog
        isOpen={false}
        message="정말 삭제하시겠습니까?"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />
    );
    expect(
      screen.queryByText('정말 삭제하시겠습니까?')
    ).not.toBeInTheDocument();
  });
});
