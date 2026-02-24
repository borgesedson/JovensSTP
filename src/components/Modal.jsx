import React, { useEffect } from "react";

/**
 * Modal genérico reutilizável
 * Props:
 * - isOpen: boolean (exibe ou não)
 * - onClose: função chamada ao fechar (esc, clique fora, etc)
 * - children: conteúdo do modal
 */
const Modal = ({ isOpen, onClose, children }) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-full max-h-full overflow-auto p-0"
        style={{ minWidth: 320, minHeight: 80 }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};

export default Modal;
