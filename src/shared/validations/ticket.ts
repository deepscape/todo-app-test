// Zod 검증 스키마 (docs/API_SPEC.md §457)
// 프론트엔드 폼과 백엔드 Route Handler에서 동일 스키마를 공유한다.
import { z } from 'zod';

const TITLE_REQUIRED_MESSAGE = '제목을 입력해주세요';

export const createTicketSchema = z.object({
  // required_error: 필드 누락 / refine: 빈 문자열·공백만 입력 — 두 경로 모두
  // 동일 메시지("제목을 입력해주세요")를 반환해야 한다 (docs/REQUIREMENTS.md §31-36).
  title: z
    .string({ required_error: TITLE_REQUIRED_MESSAGE })
    .max(200, '제목은 200자 이내로 입력해주세요')
    .refine((val) => val.trim().length > 0, TITLE_REQUIRED_MESSAGE),
  description: z
    .string()
    .max(1000, '설명은 1000자 이내로 입력해주세요')
    .optional(),
  priority: z
    .enum(['LOW', 'MEDIUM', 'HIGH'], {
      errorMap: () => ({ message: '우선순위는 LOW, MEDIUM, HIGH 중 선택해주세요' }),
    })
    .optional(),
  plannedStartDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine(
      (val) => val >= new Date().toISOString().split('T')[0],
      '종료예정일은 오늘 이후 날짜를 선택해주세요'
    )
    .optional(),
});

// CreateTicketInput: POST /api/tickets 요청 타입의 단일 소스(SSOT).
// src/shared/types 에 별도 인터페이스를 두지 않고 여기서 도출해 사용한다.
export type CreateTicketInput = z.infer<typeof createTicketSchema>;

// PATCH /api/tickets/:id 요청 스키마 (docs/API_SPEC.md §4, §457).
// nullable + optional: 필드 미전달(undefined)=기존 값 유지,
// null=명시적으로 비움, 값 전달=변경 — 세 가지 상태를 구분해야 하므로
// title/priority(삭제 불가 필드)는 nullable이 아니다.
export const updateTicketSchema = z.object({
  title: z
    .string()
    .max(200, '제목은 200자 이내로 입력해주세요')
    .refine((val) => val.trim().length > 0, TITLE_REQUIRED_MESSAGE)
    .optional(),
  description: z
    .string()
    .max(1000, '설명은 1000자 이내로 입력해주세요')
    .nullable()
    .optional(),
  priority: z
    .enum(['LOW', 'MEDIUM', 'HIGH'], {
      errorMap: () => ({ message: '우선순위는 LOW, MEDIUM, HIGH 중 선택해주세요' }),
    })
    .optional(),
  plannedStartDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine(
      (val) => !val || val >= new Date().toISOString().split('T')[0],
      '종료예정일은 오늘 이후 날짜를 선택해주세요'
    )
    .nullable()
    .optional(),
});

// UpdateTicketInput: PATCH /api/tickets/:id 요청 타입의 단일 소스(SSOT).
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;

// PATCH /api/tickets/reorder 요청 스키마 (docs/API_SPEC.md §7, §457).
// status 열거형에 DONE을 포함하지 않아, DONE 요청 시 자동으로
// VALIDATION_ERROR가 발생한다 (Done 이동은 별도 완료 처리 API 사용).
export const reorderTicketSchema = z.object({
  ticketId: z.number().int().positive(),
  status: z.enum(['BACKLOG', 'TODO', 'IN_PROGRESS'], {
    errorMap: () => ({ message: '상태는 BACKLOG, TODO, IN_PROGRESS 중 선택해주세요' }),
  }),
  position: z.number().int(),
});

// ReorderTicketInput: PATCH /api/tickets/reorder 요청 타입의 단일 소스(SSOT).
export type ReorderTicketInput = z.infer<typeof reorderTicketSchema>;
