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

// --- API 요청 타입 ---

// POST /api/tickets
export interface CreateTicketInput {
  title: string;
  description?: string;
  priority?: TicketPriority;
  plannedStartDate?: string; // YYYY-MM-DD
  dueDate?: string; // YYYY-MM-DD
}
