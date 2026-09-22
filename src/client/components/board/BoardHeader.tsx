// docs/COMPONENT_SPEC.md §2.2 BoardHeader. "Tika" 타이틀 + SearchInput
// (2차 구현 예정, MVP에서는 비활성 placeholder) + CreateTicketButton
// ("새 업무", 클릭 시 TicketForm 생성 모달을 여는 건 상위 BoardContainer
// 책임 — 여기서는 onCreateClick만 호출).
import { Button } from '@/client/components/ui/Button';

interface BoardHeaderProps {
  onCreateClick: () => void;
}

export function BoardHeader({ onCreateClick }: BoardHeaderProps) {
  return (
    <header className="flex items-center justify-between gap-4 p-4">
      <h1 className="text-xl font-bold text-text-primary">Tika</h1>
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="검색 (준비 중)"
          disabled
          className="form-input"
        />
        <Button onClick={onCreateClick}>새 업무</Button>
      </div>
    </header>
  );
}
