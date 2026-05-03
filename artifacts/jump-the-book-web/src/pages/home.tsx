import { Link } from "wouter";
import { motion } from "framer-motion";

/**
 * Landing screen (W·01 in the design handoff).
 *
 * Spec: single-screen pitch. Wordmark, one sentence, two actions. No
 * marketing fluff. Vertically centered, max 720px column, no scroll.
 */
export default function Home() {
  return (
    <div className="min-h-[100dvh] dark bg-background text-foreground flex flex-col">
      <main className="flex-1 flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full max-w-[720px] text-center space-y-10"
        >
          <div className="flex items-center justify-center gap-3 jtb-eyebrow">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            <span>Jump the Book · v1</span>
          </div>

          {/* Brand bunny — signed-out visitors should see the mascot up top
              so the landing reads as part of the same product as the logged-in
              shell, where the bunny lives in the header. */}
          <motion.img
            src={`${import.meta.env.BASE_URL}logo-mark.svg`}
            alt=""
            aria-hidden="true"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.5, ease: "easeOut" }}
            className="mx-auto w-20 h-20 sm:w-24 sm:h-24 drop-shadow-[0_6px_20px_rgba(201,169,106,0.25)]"
          />

          <h1 className="font-serif font-normal tracking-[-0.03em] leading-[0.95] text-foreground text-[56px] sm:text-[88px]">
            Jump <em className="not-italic font-serif italic text-primary">the</em> Book.
          </h1>

          <p className="font-serif italic text-muted-foreground leading-snug text-lg sm:text-[22px] max-w-[640px] mx-auto">
            A reading-and-review companion for people who like books a little
            too much. See the worlds you read, scene by spoiler-free scene.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Link
              href="/sign-up"
              className="inline-flex items-center justify-center h-12 px-6 rounded-[10px] bg-primary text-primary-foreground border border-[var(--jtb-accent-hi)] font-semibold text-sm hover:brightness-110 transition-[filter] shadow-[0_6px_20px_rgba(201,169,106,0.25)]"
            >
              Start a shelf
            </Link>
            <Link
              href="/sign-in"
              className="inline-flex items-center justify-center h-12 px-6 rounded-[10px] bg-transparent text-[var(--jtb-accent-hi)] border border-[var(--jtb-border-hi)] font-semibold text-sm hover:bg-[rgba(201,169,106,0.06)] hover:border-primary transition-colors"
            >
              I have an account
            </Link>
          </div>
        </motion.div>
      </main>

      <footer className="py-10 text-center jtb-label">
        Reading is for readers.
      </footer>
    </div>
  );
}
