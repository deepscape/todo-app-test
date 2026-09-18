// 컴포넌트 프리뷰 갤러리 — docs/FRONTEND_TASKS.md Phase별 개발 중 시각
// 확인용. DB/API 연결 없이 목 데이터로만 렌더링한다. 프로덕션 라우트가
// 아니므로 실제 서비스 네비게이션에는 노출하지 않는다.
//
// 사용법: `npm run dev` 후 http://localhost:3000/preview
// 각 Phase 컴포넌트가 완성되면 아래 해당 섹션의 플레이스홀더를 실제
// 컴포넌트 렌더링으로 교체한다 (docs/FRONTEND_TASKS.md 체크리스트 참고).
'use client';

import { useState } from 'react';
import { Button } from '@/client/components/ui/Button';
import { PriorityBadge } from '@/client/components/ui/PriorityBadge';
import { DueDateBadge } from '@/client/components/ui/DueDateBadge';
import { Modal } from '@/client/components/ui/Modal';
import { ConfirmDialog } from '@/client/components/ui/ConfirmDialog';

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
      <div className="flex flex-wrap items-start gap-4">{children}</div>
    </section>
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

      {/* Phase 1 — Badge, Button */}
      <PreviewSection title="Phase 1: Badge / Button">
        <div className="flex w-full flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <PriorityBadge priority="LOW" />
            <PriorityBadge priority="MEDIUM" />
            <PriorityBadge priority="HIGH" />
            <DueDateBadge dueDate="2026-12-31" isOverdue={false} />
            <DueDateBadge dueDate="2020-01-01" isOverdue />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="ghost">Ghost</Button>
            <Button isLoading>Loading</Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
          </div>
        </div>
      </PreviewSection>

      {/* Phase 2 — Modal, ConfirmDialog */}
      <PreviewSection title="Phase 2: Modal / ConfirmDialog">
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => setIsModalOpen(true)}>Modal 열기</Button>
          <Button variant="danger" onClick={() => setIsConfirmOpen(true)}>
            ConfirmDialog 열기
          </Button>
        </div>
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
          <p className="text-text-primary">간단한 Modal 컨텐츠 예시</p>
        </Modal>
        <ConfirmDialog
          isOpen={isConfirmOpen}
          message="정말 삭제하시겠습니까?"
          onConfirm={() => setIsConfirmOpen(false)}
          onCancel={() => setIsConfirmOpen(false)}
        />
      </PreviewSection>

      {/* Phase 3 — TicketCard, TicketForm */}
      <PreviewSection title="Phase 3: TicketCard / TicketForm">
        <EmptyPlaceholder note="src/client/components/ticket/TicketCard.tsx, TicketForm.tsx 구현 후 여기에 렌더링" />
      </PreviewSection>

      {/* Phase 4 — TicketModal, ColumnHeader */}
      <PreviewSection title="Phase 4: TicketModal / ColumnHeader">
        <EmptyPlaceholder note="src/client/components/ticket/TicketModal.tsx, board/ColumnHeader.tsx 구현 후 여기에 렌더링" />
      </PreviewSection>

      {/* Phase 5 — Column */}
      <PreviewSection title="Phase 5: Column">
        <EmptyPlaceholder note="src/client/components/board/Column.tsx 구현 후 여기에 렌더링" />
      </PreviewSection>

      {/* Phase 7 — BoardHeader, FilterBar (Phase 6은 UI가 아니므로 프리뷰 대상 아님) */}
      <PreviewSection title="Phase 7: BoardHeader / FilterBar">
        <EmptyPlaceholder note="src/client/components/board/BoardHeader.tsx, FilterBar.tsx 구현 후 여기에 렌더링" />
      </PreviewSection>

      {/* Phase 8 — Board */}
      <PreviewSection title="Phase 8: Board">
        <EmptyPlaceholder note="src/client/components/board/Board.tsx 구현 후 여기에 렌더링" />
      </PreviewSection>

      {/* Phase 9 — BoardContainer */}
      <PreviewSection title="Phase 9: BoardContainer">
        <EmptyPlaceholder note="src/client/components/board/BoardContainer.tsx 구현 후 여기에 렌더링" />
      </PreviewSection>
    </main>
  );
}
