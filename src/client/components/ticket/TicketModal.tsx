// docs/COMPONENT_SPEC.md §2.7, docs/TEST_CASES.md TC-COMP-005 TicketModal.
// Modal(오버레이/ESC) + TicketDetailView(읽기전용 4필드) +
// TicketForm(edit 모드, 편집가능 5필드) + ConfirmDialog(삭제 2단계 확인)
// 조합. 인라인 편집 UI를 별도로 만들지 않고 TicketForm(mode="edit")을
// 그대로 재사용해 Zod 검증(updateTicketSchema aligned 필드 집합)까지
// 이어받는다.
'use client';

import { useState } from 'react';
import { Modal } from '@/client/components/ui/Modal';
import { ConfirmDialog } from '@/client/components/ui/ConfirmDialog';
import { Button } from '@/client/components/ui/Button';
import { TicketDetailView } from './TicketDetailView';
import { TicketForm, type TicketFormValues } from './TicketForm';
import type { TicketWithMeta } from '@/shared/types';
import type { UpdateTicketInput } from '@/shared/validations/ticket';

interface TicketModalProps {
  ticket: TicketWithMeta;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (id: number, data: UpdateTicketInput) => void;
  onDelete: (id: number) => void;
  isLoading?: boolean;
}

export function TicketModal({
  ticket,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  isLoading = false,
}: TicketModalProps) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const handleSubmit = (values: TicketFormValues) => {
    onUpdate(ticket.id, values);
  };

  const handleConfirmDelete = () => {
    setIsConfirmOpen(false);
    onDelete(ticket.id);
  };

  if (isOpen && isConfirmOpen) {
    return (
      <ConfirmDialog
        isOpen
        message="정말 삭제하시겠습니까?"
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsConfirmOpen(false)}
      />
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <TicketDetailView ticket={ticket} />

        <TicketForm
          mode="edit"
          initialData={{
            title: ticket.title,
            description: ticket.description ?? undefined,
            priority: ticket.priority,
            plannedStartDate: ticket.plannedStartDate ?? undefined,
            dueDate: ticket.dueDate ?? undefined,
          }}
          onSubmit={handleSubmit}
          onCancel={onClose}
          isLoading={isLoading}
        />

        <div className="flex justify-start border-t border-neutral-border pt-4">
          <Button variant="danger" onClick={() => setIsConfirmOpen(true)}>
            삭제
          </Button>
        </div>
      </div>
    </Modal>
  );
}
