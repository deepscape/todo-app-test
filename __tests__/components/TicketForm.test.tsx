/**
 * TicketForm 컴포넌트 테스트 (TDD Red)
 *
 * 스펙: docs/TEST_CASES.md TC-COMP-004, docs/COMPONENT_SPEC.md §2.8,
 * docs/FRONTEND_TASKS.md Phase 3.1
 * 대상: src/client/components/ticket/TicketForm.tsx (아직 미구현)
 *
 * src/shared/validations/ticket.ts의 createTicketSchema를 폼 검증에
 * 그대로 사용한다 — 백엔드(POST /api/tickets)와 동일한 Zod 스키마를
 * 공유하여 검증 규칙이 두 곳에서 따로 갱신되는 것을 방지한다.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TicketForm } from '../../src/client/components/ticket/TicketForm';

function getTitleInput() {
  return screen.getByLabelText('제목');
}

function getDescriptionInput() {
  return screen.getByLabelText('설명');
}

function getPriorityInput() {
  return screen.getByLabelText('우선순위');
}

function getPlannedStartDateInput() {
  return screen.getByLabelText('시작예정일');
}

function getDueDateInput() {
  return screen.getByLabelText('종료예정일');
}

describe('TicketForm', () => {
  // C004-1: 빈 폼 렌더링 (생성 모드) — 빈 필드들, 우선순위 MEDIUM 기본 선택
  it('C004-1: mode="create"면 모든 필드가 비어있고 우선순위는 MEDIUM이 기본 선택된다', () => {
    render(
      <TicketForm mode="create" onSubmit={jest.fn()} onCancel={jest.fn()} />
    );

    expect(getTitleInput()).toHaveValue('');
    expect(getDescriptionInput()).toHaveValue('');
    expect(getPlannedStartDateInput()).toHaveValue('');
    expect(getDueDateInput()).toHaveValue('');
    expect(getPriorityInput()).toHaveValue('MEDIUM');
  });

  // C004-2: 기존 데이터 표시 (수정 모드) — initialData가 각 필드에 반영
  it('C004-2: mode="edit" + initialData면 필드에 기존 값이 채워진다', () => {
    render(
      <TicketForm
        mode="edit"
        initialData={{
          title: '기존 제목',
          description: '기존 설명',
          priority: 'HIGH',
          plannedStartDate: '2026-10-01',
          dueDate: '2026-10-31',
        }}
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    expect(getTitleInput()).toHaveValue('기존 제목');
    expect(getDescriptionInput()).toHaveValue('기존 설명');
    expect(getPriorityInput()).toHaveValue('HIGH');
    expect(getPlannedStartDateInput()).toHaveValue('2026-10-01');
    expect(getDueDateInput()).toHaveValue('2026-10-31');
  });

  // C004-3: 빈 제목 제출 → "제목을 입력해주세요" 에러
  it('C004-3: 제목을 비운 채 제출하면 "제목을 입력해주세요" 에러가 표시되고 onSubmit이 호출되지 않는다', async () => {
    const user = userEvent.setup();
    const handleSubmit = jest.fn();

    render(
      <TicketForm mode="create" onSubmit={handleSubmit} onCancel={jest.fn()} />
    );

    await user.click(screen.getByRole('button', { name: '저장' }));

    expect(screen.getByText('제목을 입력해주세요')).toBeInTheDocument();
    expect(handleSubmit).not.toHaveBeenCalled();
  });

  // C004-4: 과거 종료예정일 → "종료예정일은 오늘 이후 날짜를 선택해주세요" 에러
  it('C004-4: 과거 날짜를 종료예정일에 입력하고 제출하면 에러가 표시된다', async () => {
    const user = userEvent.setup();
    const handleSubmit = jest.fn();

    render(
      <TicketForm mode="create" onSubmit={handleSubmit} onCancel={jest.fn()} />
    );

    await user.type(getTitleInput(), '유효한 제목');
    await user.type(getDueDateInput(), '2020-01-01');
    await user.click(screen.getByRole('button', { name: '저장' }));

    expect(
      screen.getByText('종료예정일은 오늘 이후 날짜를 선택해주세요')
    ).toBeInTheDocument();
    expect(handleSubmit).not.toHaveBeenCalled();
  });

  // Web Interface Guidelines: "focus first error on submit"
  it('제출 실패 시 첫 번째 에러 필드(제목)로 포커스가 이동한다', async () => {
    const user = userEvent.setup();

    render(
      <TicketForm mode="create" onSubmit={jest.fn()} onCancel={jest.fn()} />
    );

    await user.click(screen.getByRole('button', { name: '저장' }));

    expect(getTitleInput()).toHaveFocus();
  });

  it('제목은 유효하고 종료예정일만 에러면 종료예정일 필드로 포커스가 이동한다', async () => {
    const user = userEvent.setup();

    render(
      <TicketForm mode="create" onSubmit={jest.fn()} onCancel={jest.fn()} />
    );

    await user.type(getTitleInput(), '유효한 제목');
    await user.type(getDueDateInput(), '2020-01-01');
    await user.click(screen.getByRole('button', { name: '저장' }));

    expect(getDueDateInput()).toHaveFocus();
  });

  // C004-5: 시작예정일 필드 존재 — plannedStartDate date input 렌더링
  it('C004-5: plannedStartDate 필드가 type="date" input으로 렌더된다', () => {
    render(
      <TicketForm mode="create" onSubmit={jest.fn()} onCancel={jest.fn()} />
    );

    expect(getPlannedStartDateInput()).toHaveAttribute('type', 'date');
  });

  // C004-6: 정상 제출 — 모든 필드 입력 → onSubmit 호출 + 전달된 데이터 확인
  it('C004-6: 모든 필드를 입력하고 제출하면 onSubmit이 입력한 데이터로 호출된다', async () => {
    const user = userEvent.setup();
    const handleSubmit = jest.fn();

    render(
      <TicketForm mode="create" onSubmit={handleSubmit} onCancel={jest.fn()} />
    );

    await user.type(getTitleInput(), '새 티켓 제목');
    await user.type(getDescriptionInput(), '새 티켓 설명');
    await user.selectOptions(getPriorityInput(), 'HIGH');
    await user.type(getPlannedStartDateInput(), '2026-10-01');
    await user.type(getDueDateInput(), '2026-10-31');
    await user.click(screen.getByRole('button', { name: '저장' }));

    expect(handleSubmit).toHaveBeenCalledTimes(1);
    expect(handleSubmit).toHaveBeenCalledWith({
      title: '새 티켓 제목',
      description: '새 티켓 설명',
      priority: 'HIGH',
      plannedStartDate: '2026-10-01',
      dueDate: '2026-10-31',
    });
  });

  it('C004-6b: 제목만 입력한 뒤 Enter 키로도 제출된다', async () => {
    const user = userEvent.setup();
    const handleSubmit = jest.fn();

    render(
      <TicketForm mode="create" onSubmit={handleSubmit} onCancel={jest.fn()} />
    );

    await user.type(getTitleInput(), '엔터로 제출{Enter}');

    expect(handleSubmit).toHaveBeenCalledTimes(1);
  });

  // C004-7: 로딩 상태 — isLoading=true → 버튼 비활성화 + 스피너
  it('C004-7: isLoading=true면 저장 버튼이 비활성화된다', () => {
    render(
      <TicketForm
        mode="create"
        isLoading
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    expect(screen.getByRole('button', { name: '처리중 ...' })).toBeDisabled();
  });

  it('취소 버튼 클릭 시 onCancel이 호출된다', async () => {
    const user = userEvent.setup();
    const handleCancel = jest.fn();

    render(
      <TicketForm mode="create" onSubmit={jest.fn()} onCancel={handleCancel} />
    );

    await user.click(screen.getByRole('button', { name: '취소' }));

    expect(handleCancel).toHaveBeenCalledTimes(1);
  });
});
