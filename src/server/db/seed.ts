// 개발/프론트엔드 검증용 시드 데이터 (docs/DATA_MODEL.md §6 기준).
// 모든 날짜는 실행 시점(오늘) 기준 상대 오프셋으로 계산한다 — 문서의
// 절대 날짜를 그대로 쓰면 시간이 지날수록 isOverdue/Done 24시간 노출
// 같은 파생 규칙을 눈으로 확인할 수 없게 되기 때문이다.
import { db } from './index';
import { tickets } from './schema';

const DAY_MS = 24 * 60 * 60 * 1000;

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * DAY_MS);
}

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * DAY_MS);
}

function dateOnly(d: Date): string {
  return d.toISOString().split('T')[0];
}

async function seed(): Promise<void> {
  await db.delete(tickets);

  await db.insert(tickets).values([
    // DONE — 완료된 지 24시간 이내: 보드 조회 시 Done 칼럼에 노출된다.
    {
      title: '프로젝트 요구사항 정리',
      status: 'DONE',
      priority: 'HIGH',
      position: 0,
      plannedStartDate: dateOnly(daysAgo(6)),
      dueDate: dateOnly(daysAgo(1)),
      startedAt: daysAgo(6),
      completedAt: daysAgo(0.5), // 12시간 전 — 노출됨
    },
    // DONE — 완료된 지 24시간 초과: 보드 조회 시 Done 칼럼에서 숨겨진다.
    {
      title: 'UI 와이어프레임 작성',
      status: 'DONE',
      priority: 'MEDIUM',
      position: 1024,
      dueDate: dateOnly(daysAgo(3)),
      startedAt: daysAgo(5),
      completedAt: daysAgo(2), // 48시간 전 — 숨겨짐
    },
    // IN_PROGRESS — dueDate가 지나 isOverdue=true.
    {
      title: 'API 설계 문서 작성',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      position: 0,
      dueDate: dateOnly(daysAgo(2)),
      startedAt: daysAgo(4),
    },
    // IN_PROGRESS — dueDate가 남아 isOverdue=false.
    {
      title: 'DB 스키마 설계',
      status: 'IN_PROGRESS',
      priority: 'MEDIUM',
      position: 1024,
      plannedStartDate: dateOnly(daysAgo(1)),
      dueDate: dateOnly(daysFromNow(5)),
      startedAt: daysAgo(1),
    },
    // TODO — 시작예정일/종료예정일 모두 미래.
    {
      title: '로그인 페이지 구현',
      status: 'TODO',
      priority: 'HIGH',
      position: 0,
      plannedStartDate: dateOnly(daysFromNow(2)),
      dueDate: dateOnly(daysFromNow(9)),
      startedAt: daysAgo(0.2),
    },
    // TODO — dueDate 없음(오버듀 대상 아님).
    {
      title: '대시보드 레이아웃',
      status: 'TODO',
      priority: 'MEDIUM',
      position: 1024,
      startedAt: daysAgo(0.1),
    },
    // BACKLOG — 일정 미지정.
    {
      title: '알림 기능 조사',
      status: 'BACKLOG',
      priority: 'LOW',
      position: 0,
    },
    // BACKLOG — 시작예정일만 지정.
    {
      title: '성능 테스트 계획',
      status: 'BACKLOG',
      priority: 'MEDIUM',
      position: 1024,
      plannedStartDate: dateOnly(daysFromNow(3)),
    },
    // BACKLOG — 제목만 있는 최소 케이스.
    {
      title: 'CI/CD 파이프라인 구축',
      status: 'BACKLOG',
      priority: 'LOW',
      position: 2048,
    },
  ]);

  console.log('시드 데이터 9건 삽입 완료.');
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('시드 실패:', err);
    process.exit(1);
  });
