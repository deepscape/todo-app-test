// 컴포넌트 프리뷰 갤러리 — docs/FRONTEND_TASKS.md Phase별 개발 중 시각
// 확인용. DB/API 연결 없이 목 데이터로만 렌더링한다. 프로덕션 라우트가
// 아니므로 실제 서비스 네비게이션에는 노출하지 않는다.
//
// 사용법: `npm run dev` 후 http://localhost:3000/preview
// 각 Phase 컴포넌트가 완성되면 아래 해당 섹션의 플레이스홀더를 실제
// 컴포넌트 렌더링으로 교체한다 (docs/FRONTEND_TASKS.md 체크리스트 참고).
'use client';

import { useState } from 'react';
import { DndContext } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import { Button } from '@/client/components/ui/Button';
import { PriorityBadge } from '@/client/components/ui/PriorityBadge';
import { DueDateBadge } from '@/client/components/ui/DueDateBadge';
import { Modal } from '@/client/components/ui/Modal';
import { ConfirmDialog } from '@/client/components/ui/ConfirmDialog';
import { TicketCard } from '@/client/components/ticket/TicketCard';
import type { TicketWithMeta } from '@/shared/types';

// TicketCard는 useSortable을 쓰므로 DndContext+SortableContext 없이는
// 렌더할 수 없다. 프리뷰 전용 최소 래퍼 — 실제 드래그 로직은 Phase 5
// Column/Phase 8 Board에서 붙인다.
function SortableContextPreview({ children }: { children: React.ReactNode }) {
  return (
    <DndContext>
      <SortableContext items={[1, 2, 3, 4]}>{children}</SortableContext>
    </DndContext>
  );
}

function makePreviewTicket(
  overrides: Partial<TicketWithMeta> = {}
): TicketWithMeta {
  return {
    id: 1,
    title: '샘플 티켓 제목',
    description: null,
    status: 'TODO',
    priority: 'MEDIUM',
    position: 0,
    plannedStartDate: null,
    dueDate: '2026-12-31',
    startedAt: null,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    isOverdue: false,
    ...overrides,
  };
}

// 1뎁스: Phase 전체 묶음
function PreviewSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-neutral-border pb-8">
      <h2 className="mb-4 text-lg font-semibold text-text-primary">
        {title}
      </h2>
      <div className="flex flex-col gap-6">{children}</div>
    </section>
  );
}

// 2뎁스: Phase 안의 개별 컴포넌트 묶음 (예: Button, Badge, Modal)
function ComponentGroup({
  name,
  children,
}: {
  name: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-text-secondary">
        {name}
      </h3>
      <div className="flex flex-wrap items-start gap-2">{children}</div>
    </div>
  );
}

function EmptyPlaceholder({ note }: { note: string }) {
  return (
    <p className="text-sm text-text-muted">
      아직 구현되지 않음 — {note}
    </p>
  );
}

export default function PreviewPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-8 p-8">
      <header>
        <h1 className="text-2xl font-bold text-text-primary">
          컴포넌트 프리뷰
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          docs/FRONTEND_TASKS.md의 Phase 순서대로 컴포넌트를 이 페이지에
          추가한다. 목 데이터만 사용하며 실제 API를 호출하지 않는다.
        </p>
      </header>

      {/* Phase 1 — 공통 프리미티브 (Badge, Button) */}
      <PreviewSection title="Phase 1-2: 공통 UI 컴포넌트 (src/client/components/ui/)">
        <ComponentGroup name="PriorityBadge">
          <PriorityBadge priority="LOW" />
          <PriorityBadge priority="MEDIUM" />
          <PriorityBadge priority="HIGH" />
        </ComponentGroup>

        <ComponentGroup name="DueDateBadge">
          <DueDateBadge dueDate="2026-12-31" isOverdue={false} />
          <DueDateBadge dueDate="2020-01-01" isOverdue />
        </ComponentGroup>

        <ComponentGroup name="Button — variant">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="ghost">Ghost</Button>
        </ComponentGroup>

        <ComponentGroup name="Button — size">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
        </ComponentGroup>

        <ComponentGroup name="Button — isLoading">
          <Button isLoading>Loading</Button>
        </ComponentGroup>

        <ComponentGroup name="Modal">
          <Button onClick={() => setIsModalOpen(true)}>Modal 열기</Button>
          <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
            <p className="text-text-primary">간단한 Modal 컨텐츠 예시</p>
          </Modal>
        </ComponentGroup>

        <ComponentGroup name="ConfirmDialog">
          <Button variant="danger" onClick={() => setIsConfirmOpen(true)}>
            ConfirmDialog 열기
          </Button>
          <ConfirmDialog
            isOpen={isConfirmOpen}
            message="정말 삭제하시겠습니까?"
            onConfirm={() => setIsConfirmOpen(false)}
            onCancel={() => setIsConfirmOpen(false)}
          />
        </ComponentGroup>
      </PreviewSection>

      {/* Phase 3 — 티켓 도메인 리프 (TicketCard, TicketForm) */}
      <PreviewSection title="Phase 3: 티켓 도메인 리프">
        <ComponentGroup name="TicketCard">
          <SortableContextPreview>
            <div className="grid w-full grid-cols-2 gap-3">
              <TicketCard
                ticket={makePreviewTicket({ id: 1, title: '기본 카드 (TODO)' })}
                onClick={() => {}}
              />
              <TicketCard
                ticket={makePreviewTicket({
                  id: 2,
                  title: '기한 초과 카드',
                  status: 'IN_PROGRESS',
                  dueDate: '2020-01-01',
                  isOverdue: true,
                })}
                onClick={() => {}}
              />
              <TicketCard
                ticket={makePreviewTicket({
                  id: 3,
                  title: '완료된 카드',
                  status: 'DONE',
                  priority: 'LOW',
                })}
                onClick={() => {}}
              />
              <TicketCard
                ticket={makePreviewTicket({
                  id: 4,
                  title:
                    '아주 긴 제목이 카드 폭을 넘어가면 말줄임(...) 처리가 되는지 확인하기 위한 예시 텍스트입니다',
                  priority: 'HIGH',
                  dueDate: null,
                })}
                onClick={() => {}}
              />
            </div>
          </SortableContextPreview>
        </ComponentGroup>
        <ComponentGroup name="TicketForm">
          <EmptyPlaceholder note="src/client/components/ticket/TicketForm.tsx 구현 후 여기에 렌더링" />
        </ComponentGroup>
      </PreviewSection>

      {/* Phase 4 — 모달 / 칼럼 헤더 (TicketModal, ColumnHeader) */}
      <PreviewSection title="Phase 4: 모달 / 칼럼 헤더">
        <ComponentGroup name="TicketModal">
          <EmptyPlaceholder note="src/client/components/ticket/TicketModal.tsx 구현 후 여기에 렌더링" />
        </ComponentGroup>
        <ComponentGroup name="ColumnHeader">
          <EmptyPlaceholder note="src/client/components/board/ColumnHeader.tsx 구현 후 여기에 렌더링" />
        </ComponentGroup>
      </PreviewSection>

      {/* Phase 5 — Column */}
      <PreviewSection title="Phase 5: Column">
        <ComponentGroup name="Column">
          <EmptyPlaceholder note="src/client/components/board/Column.tsx 구현 후 여기에 렌더링" />
        </ComponentGroup>
      </PreviewSection>

      {/* Phase 7 — 헤더 / 필터 (BoardHeader, FilterBar) (Phase 6은 UI가 아니므로 프리뷰 대상 아님) */}
      <PreviewSection title="Phase 7: 헤더 / 필터">
        <ComponentGroup name="BoardHeader">
          <EmptyPlaceholder note="src/client/components/board/BoardHeader.tsx 구현 후 여기에 렌더링" />
        </ComponentGroup>
        <ComponentGroup name="FilterBar">
          <EmptyPlaceholder note="src/client/components/board/FilterBar.tsx 구현 후 여기에 렌더링" />
        </ComponentGroup>
      </PreviewSection>

      {/* Phase 8 — Board */}
      <PreviewSection title="Phase 8: Board (DnD 통합)">
        <ComponentGroup name="Board">
          <EmptyPlaceholder note="src/client/components/board/Board.tsx 구현 후 여기에 렌더링" />
        </ComponentGroup>
      </PreviewSection>

      {/* Phase 9 — 컨테이너 + 페이지 (BoardContainer) */}
      <PreviewSection title="Phase 9: 컨테이너">
        <ComponentGroup name="BoardContainer">
          <EmptyPlaceholder note="src/client/components/board/BoardContainer.tsx 구현 후 여기에 렌더링" />
        </ComponentGroup>
      </PreviewSection>
    </main>
  );
}
