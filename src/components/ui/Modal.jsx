import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

export default function Modal({ open, onClose, title, children, wide }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
            className={`max-h-[90vh] w-full ${
              wide ? "max-w-2xl" : "max-w-md"
            } overflow-y-auto rounded-2xl border border-border-muted bg-paper shadow-2xl`}
          >
            <div className="flex items-center justify-between border-b border-border-muted px-6 py-4">
              <h2 className="text-sm font-semibold text-text-dark">{title}</h2>
              <button
                onClick={onClose}
                className="rounded-lg p-1 text-text-muted hover:bg-paper-off hover:text-text-dark"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-6">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
