import { AnimatePresence, motion } from "framer-motion";
import Logo from "./Logo";

/**
 * Shown while the app bootstraps (session check in AuthContext). Always
 * renders the dark-background logo mark, regardless of the user's saved
 * theme preference — this is a fixed brand moment, not a themed screen.
 */
export default function SplashScreen({ show }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-ink"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <Logo forceTheme="dark" className="h-16 w-auto" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
