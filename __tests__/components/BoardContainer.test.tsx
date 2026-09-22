/**
 * BoardContainer 컴포넌트 테스트 (TDD Red)
 *
 * 스펙: docs/COMPONENT_SPEC.md §2.1 BoardContainer, docs/FRONTEND_TASKS.md
 * Phase 6.1. Phase 1~5 컴포넌트 + useTickets를 조합하는 최상위
 * 클라이언트 컴포넌트. dnd-kit(core/sortable/utilities)과 useTickets는
 * mock 처리한다 — 실제 드래그 물리/네트워크 없이 조립/분기 로직만
 * 검증한다.
 * 대상: src/client/components/board/BoardContainer.tsx (아직 미구현)
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { BoardData, TicketWithMeta } from '@/shared/types';
import { BoardContainer } from '../../src/client/components/board/BoardContainer';

let capturedDndProps: {
  onDragStart?: (e: unknown) => void;
  onDragEnd?: (e: unknown) => void;
} = {};

jest.mock('@dnd-kit/core', () => ({
  DndContext: (props: {
    children: React.ReactNode;
    onDragStart?: (e: unknown) => void;
    onDragEnd?: (e: unknown) => void;
  }) => {
    capturedDndProps = props;
    return <>{props.children}</>;
  },
  DragOverlay: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  useDroppable: () => ({ setNodeRef: jest.fn(), isOver: false }),
}));

jest.mock('@dnd-kit/sortable', () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
    transition: undefined,
    isDragging: false,
  }),
  SortableContext: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

jest.mock('@dnd-kit/utilities', () => ({
  CSS: { Transform: { toString: () => undefined } },
}));

const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockRemove = jest.fn();
const mockReorder = jest.fn();
const mockComplete = jest.fn();

let mockBoard: BoardData;
let mockError: string | null = null;

jest.mock('../../src/client/hooks/useTickets', () => ({
  useTickets: () => ({
    board: mockBoard,
    isLoading: false,
    error: mockError,
    create: mockCreate,
    update: mockUpdate,
    remove: mockRemove,
    reorder: mockReorder,
    complete: mockComplete,
  }),
}));

function makeTicket(overrides: Partial<TicketWithMeta>): TicketWithMeta {
  return {
    id: 1,
    title: '티켓',
    description: null,
    status: 'TODO',
    priority: 'MEDIUM',
    position: 0,
    plannedStartDate: null,
    dueDate: null,
    startedAt: null,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    isOverdue: false,
    ...overrides,
  };
}

function makeBoard(overrides: Partial<BoardData> = {}): BoardData {
  return {
    BACKLOG: [],
    TODO: [],
    IN_PROGRESS: [],
    DONE: [],
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockBoard = makeBoard();
  mockError = null;
});

describe('BoardContainer', () => {
  it('initialData로 Board에 올바른 데이터가 전달되어 렌더된다', () => {
    mockBoard = makeBoard({
      TODO: [makeTicket({ id: 1, title: '초기 티켓' })],
    });

    render(<BoardContainer initialData={mockBoard} />);

    expect(screen.getByText('초기 티켓')).toBeInTheDocument();
  });

  it('TicketCard 클릭 시 TicketModal이 열린다', async () => {
    const user = userEvent.setup();
    mockBoard = makeBoard({
      TODO: [makeTicket({ id: 1, title: '상세보기 티켓' })],
    });

    render(<BoardContainer initialData={mockBoard} />);

    await user.click(screen.getByText('상세보기 티켓'));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('BoardHeader "새 업무" 클릭 시 TicketForm 생성 모달이 열린다', async () => {
    const user = userEvent.setup();

    render(<BoardContainer initialData={mockBoard} />);

    await user.click(screen.getByRole('button', { name: '새 업무' }));

    expect(screen.getByLabelText('제목')).toBeInTheDocument();
  });

  it('생성 폼 제출 시 useTickets.create가 호출된다', async () => {
    const user = userEvent.setup();

    render(<BoardContainer initialData={mockBoard} />);

    await user.click(screen.getByRole('button', { name: '새 업무' }));
    await user.type(screen.getByLabelText('제목'), '새 티켓');
    await user.click(screen.getByRole('button', { name: '저장' }));

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ title: '새 티켓' })
    );
  });

  it('드래그 종료 시 대상이 DONE이면 complete가 호출된다', () => {
    mockBoard = makeBoard({
      TODO: [makeTicket({ id: 1, status: 'TODO', position: 0 })],
    });

    render(<BoardContainer initialData={mockBoard} />);

    capturedDndProps.onDragEnd?.({
      active: { id: 1 },
      over: { id: 'DONE' },
    });

    expect(mockComplete).toHaveBeenCalledTimes(1);
    expect(mockComplete).toHaveBeenCalledWith(1, expect.anything());
    expect(mockReorder).not.toHaveBeenCalled();
  });

  it('드래그 종료 시 대상이 DONE이 아니면 reorder가 호출된다', () => {
    mockBoard = makeBoard({
      TODO: [makeTicket({ id: 1, status: 'TODO', position: 0 })],
      IN_PROGRESS: [],
    });

    render(<BoardContainer initialData={mockBoard} />);

    capturedDndProps.onDragEnd?.({
      active: { id: 1 },
      over: { id: 'IN_PROGRESS' },
    });

    expect(mockReorder).toHaveBeenCalledTimes(1);
    expect(mockReorder).toHaveBeenCalledWith(
      { ticketId: 1, status: 'IN_PROGRESS', position: 0 },
      expect.anything()
    );
    expect(mockComplete).not.toHaveBeenCalled();
  });

  it('over가 없으면(보드 밖으로 드롭) 아무 API도 호출되지 않는다', () => {
    mockBoard = makeBoard({
      TODO: [makeTicket({ id: 1, status: 'TODO', position: 0 })],
    });

    render(<BoardContainer initialData={mockBoard} />);

    capturedDndProps.onDragEnd?.({ active: { id: 1 }, over: null });

    expect(mockReorder).not.toHaveBeenCalled();
    expect(mockComplete).not.toHaveBeenCalled();
  });

  it('FilterBar에서 필터 변경 시 Board에는 필터링된 결과가 전달된다', async () => {
    const user = userEvent.setup();
    mockBoard = makeBoard({
      TODO: [
        makeTicket({ id: 1, title: '기한초과 티켓', status: 'TODO', isOverdue: true }),
        makeTicket({ id: 2, title: '일반 티켓', status: 'TODO', isOverdue: false }),
      ],
    });

    render(<BoardContainer initialData={mockBoard} />);

    expect(screen.getByText('일반 티켓')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /일정 초과/ }));

    expect(screen.getByText('기한초과 티켓')).toBeInTheDocument();
    expect(screen.queryByText('일반 티켓')).not.toBeInTheDocument();
  });

  it('TicketModal에서 삭제 확정 시 useTickets.remove가 호출된다', async () => {
    const user = userEvent.setup();
    mockBoard = makeBoard({
      TODO: [makeTicket({ id: 5, title: '삭제할 티켓' })],
    });

    render(<BoardContainer initialData={mockBoard} />);

    await user.click(screen.getByText('삭제할 티켓'));
    await user.click(screen.getByRole('button', { name: '삭제' }));
    await user.click(screen.getByRole('button', { name: '확인' }));

    expect(mockRemove).toHaveBeenCalledWith(5);
  });

  // Web Interface Guidelines: 실패한 비동기 작업(낙관적 업데이트 롤백
  // 등)은 사용자에게 반드시 시각적으로 알려야 한다.
  it('useTickets.error가 있으면 화면에 에러 메시지가 표시된다', () => {
    mockError = '티켓을 찾을 수 없습니다';

    render(<BoardContainer initialData={mockBoard} />);

    expect(screen.getByText('티켓을 찾을 수 없습니다')).toBeInTheDocument();
  });

  it('error가 없으면 에러 메시지가 표시되지 않는다', () => {
    render(<BoardContainer initialData={mockBoard} />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('에러 메시지는 aria-live="polite"인 영역에 표시된다(스크린리더 알림)', () => {
    mockError = '네트워크 오류가 발생했습니다';

    render(<BoardContainer initialData={mockBoard} />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('aria-live', 'polite');
    expect(alert).toHaveTextContent('네트워크 오류가 발생했습니다');
  });
});
