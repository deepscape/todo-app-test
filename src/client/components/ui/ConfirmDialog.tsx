// docs/COMPONENT_SPEC.md §3 ConfirmDialog. Modal + Button(danger)
// 조합으로 구현한다.
import { Modal } from './Modal';
import { Button } from './Button';

interface ConfirmDialogProps {
  isOpen: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  message,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel}>
      <p className="text-text-primary mb-4">{message}</p>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>
          취소
        </Button>
        <Button variant="danger" onClick={onConfirm}>
          확인
        </Button>
      </div>
    </Modal>
  );
}
