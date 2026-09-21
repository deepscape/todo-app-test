/**
 * TicketModal 컴포넌트 테스트 (TDD Red)
 *
 * 스펙: docs/TEST_CASES.md TC-COMP-005, docs/COMPONENT_SPEC.md §2.7
 * Modal + TicketDetailView(읽기전용) + TicketForm(edit 모드, 편집가능
 * 5필드) + ConfirmDialog(삭제 2단계 확인) 조합.
 * 대상: src/client/components/ticket/TicketModal.tsx (아직 미구현)
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TicketModal } from '../../src/client/components/ticket/TicketModal';
import type { TicketWithMeta } from '../../src/shared/types';

function makeTicket(overrides: Partial<TicketWithMeta> = {}): TicketWithMeta {
  return {
    id: 42,
    title: '기존 티켓 제목',
    description: '기존 티켓 설명',
    status: 'TODO',
    priority: 'HIGH',
    position: 0,
    plannedStartDate: '2026-10-01',
    dueDate: '2026-10-31',
    startedAt: new Date('2026-09-05T00:00:00.000Z'),
    completedAt: null,
    createdAt: new Date('2026-09-01T00:00:00.000Z'),
    updatedAt: new Date('2026-09-01T00:00:00.000Z'),
    isOverdue: false,
    ...overrides,
  };
}

describe('TicketModal', () => {
  // C005-1: 열기/닫기 — isOpen에 따라 표시/숨김
  it('C005-1: isOpen=false면 렌더되지 않고, true면 렌더된다', () => {
    const { rerender } = render(
      <TicketModal
        ticket={makeTicket()}
        isOpen={false}
        onClose={jest.fn()}
        onUpdate={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    rerender(
      <TicketModal
        ticket={makeTicket()}
        isOpen
        onClose={jest.fn()}
        onUpdate={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  // C005-2: 읽기 전용 필드 표시 — 시작일, 종료일, 상태, 생성일
  it('C005-2: 상태/시작일/종료일/생성일이 읽기 전용으로 표시된다', () => {
    render(
      <TicketModal
        ticket={makeTicket({
          status: 'TODO',
          startedAt: new Date('2026-09-05T00:00:00.000Z'),
          createdAt: new Date('2026-09-01T00:00:00.000Z'),
        })}
        isOpen
        onClose={jest.fn()}
        onUpdate={jest.fn()}
        onDelete={jest.fn()}
      />
    );

    expect(screen.getByText('TODO')).toBeInTheDocument();
    expect(screen.getByText('2026-09-05')).toBeInTheDocument();
    expect(screen.getByText('2026-09-01')).toBeInTheDocument();
  });

  // C005-3: 편집 가능 필드 — 제목, 설명, 우선순위, 시작예정일, 종료예정일
  it('C005-3: 제목/설명/우선순위/시작예정일/종료예정일이 편집 가능한 입력 요소로 렌더된다', () => {
    render(
      <TicketModal
        ticket={makeTicket()}
        isOpen
        onClose={jest.fn()}
        onUpdate={jest.fn()}
        onDelete={jest.fn()}
      />
    );

    expect(screen.getByLabelText('제목')).toHaveValue('기존 티켓 제목');
    expect(screen.getByLabelText('설명')).toHaveValue('기존 티켓 설명');
    expect(screen.getByLabelText('우선순위')).toHaveValue('HIGH');
    expect(screen.getByLabelText('시작예정일')).toHaveValue('2026-10-01');
    expect(screen.getByLabelText('종료예정일')).toHaveValue('2026-10-31');
  });

  it('C005-3b: 편집 후 저장하면 onUpdate가 티켓 id와 변경된 데이터로 호출된다', async () => {
    const user = userEvent.setup();
    const handleUpdate = jest.fn();

    render(
      <TicketModal
        ticket={makeTicket()}
        isOpen
        onClose={jest.fn()}
        onUpdate={handleUpdate}
        onDelete={jest.fn()}
      />
    );

    const titleInput = screen.getByLabelText('제목');
    await user.clear(titleInput);
    await user.type(titleInput, '수정된 제목');
    await user.click(screen.getByRole('button', { name: '저장' }));

    expect(handleUpdate).toHaveBeenCalledTimes(1);
    expect(handleUpdate).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ title: '수정된 제목' })
    );
  });

  // C005-4: ESC 닫기
  it('C005-4: ESC 키를 누르면 onClose가 호출된다', async () => {
    const user = userEvent.setup();
    const handleClose = jest.fn();

    render(
      <TicketModal
        ticket={makeTicket()}
        isOpen
        onClose={handleClose}
        onUpdate={jest.fn()}
        onDelete={jest.fn()}
      />
    );

    await user.keyboard('{Escape}');

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  // C005-5: 바깥 클릭 닫기
  it('C005-5: 오버레이를 클릭하면 onClose가 호출된다', async () => {
    const user = userEvent.setup();
    const handleClose = jest.fn();

    render(
      <TicketModal
        ticket={makeTicket()}
        isOpen
        onClose={handleClose}
        onUpdate={jest.fn()}
        onDelete={jest.fn()}
      />
    );

    await user.click(screen.getByTestId('modal-overlay'));

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  // C005-6: 삭제 확인 — 삭제 버튼 -> ConfirmDialog -> 확인 -> onDelete
  it('C005-6: 삭제 버튼 클릭 시 바로 onDelete가 호출되지 않고 ConfirmDialog가 열린다', async () => {
    const user = userEvent.setup();
    const handleDelete = jest.fn();

    render(
      <TicketModal
        ticket={makeTicket()}
        isOpen
        onClose={jest.fn()}
        onUpdate={jest.fn()}
        onDelete={handleDelete}
      />
    );

    await user.click(screen.getByRole('button', { name: '삭제' }));

    expect(handleDelete).not.toHaveBeenCalled();
    expect(
      screen.getByText('정말 삭제하시겠습니까?')
    ).toBeInTheDocument();
  });

  it('C005-6b: ConfirmDialog에서 확인을 클릭하면 onDelete가 티켓 id로 호출된다', async () => {
    const user = userEvent.setup();
    const handleDelete = jest.fn();

    render(
      <TicketModal
        ticket={makeTicket()}
        isOpen
        onClose={jest.fn()}
        onUpdate={jest.fn()}
        onDelete={handleDelete}
      />
    );

    await user.click(screen.getByRole('button', { name: '삭제' }));
    await user.click(screen.getByRole('button', { name: '확인' }));

    expect(handleDelete).toHaveBeenCalledTimes(1);
    expect(handleDelete).toHaveBeenCalledWith(42);
  });

  it('C005-6c: ConfirmDialog에서 취소를 클릭하면 onDelete가 호출되지 않고 닫힌다', async () => {
    const user = userEvent.setup();
    const handleDelete = jest.fn();

    render(
      <TicketModal
        ticket={makeTicket()}
        isOpen
        onClose={jest.fn()}
        onUpdate={jest.fn()}
        onDelete={handleDelete}
      />
    );

    await user.click(screen.getByRole('button', { name: '삭제' }));
    await user.click(screen.getByRole('button', { name: '취소' }));

    expect(handleDelete).not.toHaveBeenCalled();
    expect(
      screen.queryByText('정말 삭제하시겠습니까?')
    ).not.toBeInTheDocument();
  });
});
