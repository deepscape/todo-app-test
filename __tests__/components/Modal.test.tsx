/**
 * Modal 컴포넌트 테스트 (TDD Red)
 *
 * 스펙: docs/FRONTEND_TASKS.md Phase 2.1, docs/COMPONENT_SPEC.md §3 Modal
 * — 오버레이 + 중앙 정렬 컨테이너, ESC 닫기, 바깥 클릭 닫기,
 * 열림/닫힘 애니메이션, body 스크롤 잠금.
 *
 * 대상: src/client/components/ui/Modal.tsx (아직 미구현)
 *
 * 5개 테스트: isOpen, ESC 닫기, 오버레이 클릭 닫기, 컨텐츠 클릭 무시,
 * role=dialog.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from '../../src/client/components/ui/Modal';

describe('Modal', () => {
  it('isOpen=false면 children을 렌더하지 않는다', () => {
    render(
      <Modal isOpen={false} onClose={jest.fn()}>
        <p>모달 내용</p>
      </Modal>
    );
    expect(screen.queryByText('모달 내용')).not.toBeInTheDocument();
  });

  it('isOpen=true면 children을 렌더한다', () => {
    render(
      <Modal isOpen onClose={jest.fn()}>
        <p>모달 내용</p>
      </Modal>
    );
    expect(screen.getByText('모달 내용')).toBeInTheDocument();
  });

  it('ESC 키 입력 시 onClose가 호출된다', async () => {
    const user = userEvent.setup();
    const handleClose = jest.fn();
    render(
      <Modal isOpen onClose={handleClose}>
        <p>모달 내용</p>
      </Modal>
    );

    await user.keyboard('{Escape}');

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('오버레이(바깥 영역) 클릭 시 onClose가 호출된다', async () => {
    const user = userEvent.setup();
    const handleClose = jest.fn();
    render(
      <Modal isOpen onClose={handleClose}>
        <p>모달 내용</p>
      </Modal>
    );

    await user.click(screen.getByTestId('modal-overlay'));

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('모달 컨텐츠 내부 클릭 시 onClose가 호출되지 않는다', async () => {
    const user = userEvent.setup();
    const handleClose = jest.fn();
    render(
      <Modal isOpen onClose={handleClose}>
        <p>모달 내용</p>
      </Modal>
    );

    await user.click(screen.getByText('모달 내용'));

    expect(handleClose).not.toHaveBeenCalled();
  });

  it('role="dialog"를 가진다', () => {
    render(
      <Modal isOpen onClose={jest.fn()}>
        <p>모달 내용</p>
      </Modal>
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('열려있는 동안 body 스크롤을 잠그고, 닫히면 원복한다', () => {
    const { rerender } = render(
      <Modal isOpen onClose={jest.fn()}>
        <p>모달 내용</p>
      </Modal>
    );
    expect(document.body.style.overflow).toBe('hidden');

    rerender(
      <Modal isOpen={false} onClose={jest.fn()}>
        <p>모달 내용</p>
      </Modal>
    );
    expect(document.body.style.overflow).not.toBe('hidden');
  });

  // Web Interface Guidelines: 오버레이가 포커스된 요소를 가려서는 안
  // 된다 — 모달이 열리면 포커스가 모달 내부로 이동해야 한다.
  it('열리면 포커스가 모달 컨테이너 내부로 이동한다', () => {
    render(
      <Modal isOpen onClose={jest.fn()}>
        <button>내부 버튼</button>
      </Modal>
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it('Tab을 눌러도 포커스가 모달 바깥으로 나가지 않는다(포커스 트랩)', async () => {
    const user = userEvent.setup();
    render(
      <>
        <button>모달 바깥 버튼</button>
        <Modal isOpen onClose={jest.fn()}>
          <button>첫번째</button>
          <button>두번째</button>
        </Modal>
      </>
    );

    const dialog = screen.getByRole('dialog');
    const first = screen.getByText('첫번째');
    const second = screen.getByText('두번째');

    first.focus();
    await user.tab();
    expect(document.activeElement).toBe(second);

    // 마지막 요소에서 Tab을 누르면 첫번째 요소로 순환한다.
    await user.tab();
    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(document.activeElement).not.toHaveTextContent('모달 바깥 버튼');
  });
});
