// docs/COMPONENT_SPEC.md §2.8 TicketForm. 생성/수정 겸용 입력 폼.
// createTicketSchema(src/shared/validations/ticket.ts)를 그대로 클라이언트
// 검증에 사용한다 — POST /api/tickets와 동일한 규칙을 SSOT로 공유하기
// 위함(docs/TRD.md §7). react-hook-form 등 신규 의존성 없이 controlled
// input + 수동 상태로 최소 구현한다(docs/FRONTEND_TASKS.md Phase 3.1).
import { useRef, useState, type FormEvent } from 'react';
import { createTicketSchema } from '@/shared/validations/ticket';
import type { TicketPriority } from '@/shared/types';
import { Button } from '@/client/components/ui/Button';

export interface TicketFormValues {
  title: string;
  description?: string;
  priority?: TicketPriority;
  plannedStartDate?: string;
  dueDate?: string;
}

interface TicketFormProps {
  mode: 'create' | 'edit';
  initialData?: Partial<TicketFormValues>;
  onSubmit: (values: TicketFormValues) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function TicketForm({
  mode,
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}: TicketFormProps) {
  const [title, setTitle] = useState(initialData?.title ?? '');
  const [description, setDescription] = useState(
    initialData?.description ?? ''
  );
  const [priority, setPriority] = useState<TicketPriority>(
    initialData?.priority ?? 'MEDIUM'
  );
  const [plannedStartDate, setPlannedStartDate] = useState(
    initialData?.plannedStartDate ?? ''
  );
  const [dueDate, setDueDate] = useState(initialData?.dueDate ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Web Interface Guidelines: "focus first error on submit" — 필드
  // 표시 순서(제목→설명→우선순위→시작예정일→종료예정일)대로 ref를
  // 두고, 검증 실패 시 그중 가장 먼저 에러가 난 필드로 포커스를
  // 옮긴다.
  const titleRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const priorityRef = useRef<HTMLSelectElement>(null);
  const plannedStartDateRef = useRef<HTMLInputElement>(null);
  const dueDateRef = useRef<HTMLInputElement>(null);

  const FIELD_REFS: Record<string, React.RefObject<HTMLElement | null>> = {
    title: titleRef,
    description: descriptionRef,
    priority: priorityRef,
    plannedStartDate: plannedStartDateRef,
    dueDate: dueDateRef,
  };
  const FIELD_ORDER = [
    'title',
    'description',
    'priority',
    'plannedStartDate',
    'dueDate',
  ];

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    const parsed = createTicketSchema.safeParse({
      title,
      description: description || undefined,
      priority,
      plannedStartDate: plannedStartDate || undefined,
      dueDate: dueDate || undefined,
    });

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.errors) {
        const field = issue.path[0];
        if (typeof field === 'string' && !fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      }
      setErrors(fieldErrors);

      const firstErrorField = FIELD_ORDER.find((field) => fieldErrors[field]);
      if (firstErrorField) {
        FIELD_REFS[firstErrorField].current?.focus();
      }
      return;
    }

    setErrors({});
    onSubmit(parsed.data);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="form-field">
        <label htmlFor="ticket-title">제목</label>
        <input
          ref={titleRef}
          id="ticket-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="form-input"
        />
        {errors.title && <p className="form-error">{errors.title}</p>}
      </div>

      <div className="form-field">
        <label htmlFor="ticket-description">설명</label>
        <textarea
          ref={descriptionRef}
          id="ticket-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="form-input"
        />
        {errors.description && (
          <p className="form-error">{errors.description}</p>
        )}
      </div>

      <div className="form-field">
        <label htmlFor="ticket-priority">우선순위</label>
        <select
          ref={priorityRef}
          id="ticket-priority"
          value={priority}
          onChange={(e) => setPriority(e.target.value as TicketPriority)}
          className="form-input"
        >
          <option value="LOW">LOW</option>
          <option value="MEDIUM">MEDIUM</option>
          <option value="HIGH">HIGH</option>
        </select>
      </div>

      <div className="form-field">
        <label htmlFor="ticket-planned-start-date">시작예정일</label>
        <input
          ref={plannedStartDateRef}
          id="ticket-planned-start-date"
          type="date"
          value={plannedStartDate}
          onChange={(e) => setPlannedStartDate(e.target.value)}
          className="form-input"
        />
        {errors.plannedStartDate && (
          <p className="form-error">{errors.plannedStartDate}</p>
        )}
      </div>

      <div className="form-field">
        <label htmlFor="ticket-due-date">종료예정일</label>
        <input
          ref={dueDateRef}
          id="ticket-due-date"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="form-input"
        />
        {errors.dueDate && <p className="form-error">{errors.dueDate}</p>}
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          취소
        </Button>
        <Button type="submit" isLoading={isLoading}>
          {mode === 'create' ? '저장' : '저장'}
        </Button>
      </div>
    </form>
  );
}
