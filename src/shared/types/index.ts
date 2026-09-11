// 공유 타입 정의 (docs/DATA_MODEL.md §4)
// 프론트/백엔드 양쪽에서 import 가능한 유일한 계층.

// --- 상태 및 우선순위 ---
export const TICKET_STATUS = {
  BACKLOG: 'BACKLOG',
  TODO: 'TODO',
  IN_PROGRESS: 'IN_PROGRESS',
  DONE: 'DONE',
} as const;

export type TicketStatus = (typeof TICKET_STATUS)[keyof typeof TICKET_STATUS];

export const TICKET_PRIORITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
} as const;

export type TicketPriority =
  (typeof TICKET_PRIORITY)[keyof typeof TICKET_PRIORITY];

// --- 티켓 타입 ---
export interface Ticket {
  id: number;
  title: string;
  description: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  position: number;
  plannedStartDate: string | null; // YYYY-MM-DD
  dueDate: string | null; // YYYY-MM-DD
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// API 요청 타입(CreateTicketInput 등)은 src/shared/validations/ticket.ts 의
// Zod 스키마에서 z.infer 로 도출한다 (SSOT). 검증 규칙과 타입이 분리되어
// 따로 갱신되는 것을 방지하기 위함 — docs/TRD.md §7.
