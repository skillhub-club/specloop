import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./App.css";

type Phase = "idle" | "spec-refine" | "transition" | "implement" | "complete";
type Story = {
  id: string;
  title: string;
  refined: boolean;
  passes: boolean;
};

const INITIAL_STORIES: Story[] = [
  { id: "S-001", title: "Add priority field to model", refined: false, passes: false },
  { id: "S-002", title: "Display priority badges", refined: false, passes: false },
  { id: "S-003", title: "Priority selector in edit form", refined: false, passes: false },
  { id: "S-004", title: "Priority filter for task list", refined: false, passes: false },
];

const STEPS_PHASE1 = [
  "Scanning spec.json + codebase structure",
  "Analyzing acceptance criteria clarity",
  "Rewriting criteria → machine-verifiable",
  "Injecting validationCommand per story",
  "Marking story refined: true",
];

const STEPS_PHASE2 = [
  "Loading guardrails.md → failure signs",
  "Selecting highest-priority story",
  "Implementing + running test suite",
  "Committing verified changes",
  "Recording learnings → progress.md",
];

function App() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [iteration, setIteration] = useState(0);
  const [activeStep, setActiveStep] = useState(-1);
  const [stories, setStories] = useState<Story[]>(INITIAL_STORIES);
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const logRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef(false);

  const addLog = useCallback((msg: string) => {
    setLog((prev) => [...prev.slice(-18), msg]);
  }, []);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [log]);

  const sleep = (ms: number) =>
    new Promise<void>((resolve) => {
      const t = setTimeout(resolve, ms);
      if (abortRef.current) {
        clearTimeout(t);
        resolve();
      }
    });

  const runLoop = async () => {
    abortRef.current = false;
    setRunning(true);
    setLog([]);
    setStories(INITIAL_STORIES.map((s) => ({ ...s })));

    addLog("$ specloop --start");
    await sleep(300);
    addLog("  [init] Loading spec.json...");
    await sleep(200);
    addLog("  [init] 4 stories found, 0 refined, 0 passing");
    await sleep(400);

    // Phase 1
    setPhase("spec-refine");
    addLog("");
    addLog("═══ PHASE 1: SPEC REFINEMENT ═══");

    for (let i = 0; i < INITIAL_STORIES.length; i++) {
      if (abortRef.current) break;
      setIteration(i + 1);
      addLog(`  [iter ${i + 1}] → ${INITIAL_STORIES[i].id}: ${INITIAL_STORIES[i].title}`);

      for (let step = 0; step < STEPS_PHASE1.length; step++) {
        if (abortRef.current) break;
        setActiveStep(step);
        await sleep(350);
      }
      setActiveStep(-1);

      setStories((prev) =>
        prev.map((s, idx) => (idx === i ? { ...s, refined: true } : s))
      );
      addLog(`  [iter ${i + 1}] ✓ ${INITIAL_STORIES[i].id} refined`);
      await sleep(250);
    }

    if (!abortRef.current) {
      addLog("  [exit] <promise>SPEC_COMPLETE</promise>");
      await sleep(600);

      setPhase("transition");
      addLog("");
      addLog("  ⚡ Stop hook intercepted exit");
      addLog("  ⚡ Phase transition: spec-refine → implement");
      await sleep(1200);

      // Phase 2
      setPhase("implement");
      addLog("");
      addLog("═══ PHASE 2: IMPLEMENTATION ═══");

      for (let i = 0; i < INITIAL_STORIES.length; i++) {
        if (abortRef.current) break;
        setIteration(i + 1);
        addLog(`  [iter ${i + 1}] → ${INITIAL_STORIES[i].id}: ${INITIAL_STORIES[i].title}`);

        for (let step = 0; step < STEPS_PHASE2.length; step++) {
          if (abortRef.current) break;
          setActiveStep(step);
          await sleep(450);
        }
        setActiveStep(-1);

        setStories((prev) =>
          prev.map((s, idx) => (idx === i ? { ...s, passes: true } : s))
        );
        addLog(`  [iter ${i + 1}] ✓ ${INITIAL_STORIES[i].id} committed + passing`);
        await sleep(250);
      }
    }

    if (!abortRef.current) {
      addLog("  [exit] <promise>COMPLETE</promise>");
      await sleep(400);
      setPhase("complete");
      addLog("");
      addLog("═══ ALL STORIES COMPLETE ═══");
      addLog("  4/4 passing · 6 commits · 0 failures");
    }
    setRunning(false);
  };

  const reset = () => {
    abortRef.current = true;
    setPhase("idle");
    setIteration(0);
    setActiveStep(-1);
    setStories(INITIAL_STORIES.map((s) => ({ ...s })));
    setLog([]);
    setRunning(false);
  };

  const phaseColor = phase === "spec-refine" ? "cyan" : phase === "implement" ? "magenta" : phase === "complete" ? "gold" : "dim";
  const storiesRefined = stories.filter((s) => s.refined).length;
  const storiesPassed = stories.filter((s) => s.passes).length;

  return (
    <div className="app" data-phase={phase}>
      {/* Scanline overlay */}
      <div className="scanlines" />

      {/* Noise texture */}
      <div className="noise" />

      <header>
        <motion.div
          className="header-inner"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="brand">
            <motion.div
              className="brand-icon"
              animate={{ rotate: running ? 360 : 0 }}
              transition={{ duration: 2, repeat: running ? Infinity : 0, ease: "linear" }}
            >
              <svg viewBox="0 0 40 40" width="40" height="40">
                <circle cx="20" cy="20" r="16" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
                <path d="M20 4 A16 16 0 0 1 36 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <circle cx="20" cy="20" r="3" fill="currentColor" />
              </svg>
            </motion.div>
            <div>
              <h1>SPEC LOOP</h1>
              <p className="tagline">Autonomous two-phase AI coding loop</p>
            </div>
          </div>
          <div className="header-stats">
            <div className="stat">
              <span className="stat-value" data-color={phaseColor}>
                {phase === "idle" ? "IDLE" : phase === "complete" ? "DONE" : phase.toUpperCase().replace("-", " ")}
              </span>
              <span className="stat-label">STATUS</span>
            </div>
            <div className="stat">
              <span className="stat-value">{iteration || "—"}</span>
              <span className="stat-label">ITERATION</span>
            </div>
            <div className="stat">
              <span className="stat-value">{storiesPassed}/{stories.length}</span>
              <span className="stat-label">PASSING</span>
            </div>
          </div>
        </motion.div>
      </header>

      <div className="grid">
        {/* Left: Pipeline visualization */}
        <motion.div
          className="pipeline"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="pipeline-header">
            <span className="section-tag">PIPELINE</span>
          </div>

          {/* Input node */}
          <PipelineNode
            active={phase !== "idle" && phase !== "complete"}
            color="white"
          >
            <div className="node-icon">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M7 8h10M7 12h6M7 16h8" />
              </svg>
            </div>
            <div>
              <div className="node-title">spec.json</div>
              <div className="node-sub">{stories.length} stories queued</div>
            </div>
          </PipelineNode>

          <Connector active={phase === "spec-refine"} color="cyan" />

          {/* Phase 1 */}
          <PhaseCard
            phase="spec-refine"
            currentPhase={phase}
            title="SPEC REFINEMENT"
            label="PHASE 01"
            color="cyan"
            steps={STEPS_PHASE1}
            activeStep={phase === "spec-refine" ? activeStep : -1}
            promise="SPEC_COMPLETE"
            metric={`${storiesRefined}/${stories.length} refined`}
          />

          <Connector active={phase === "transition"} color="magenta" label="STOP HOOK" />

          {/* Phase 2 */}
          <PhaseCard
            phase="implement"
            currentPhase={phase}
            title="IMPLEMENTATION"
            label="PHASE 02"
            color="magenta"
            steps={STEPS_PHASE2}
            activeStep={phase === "implement" ? activeStep : -1}
            promise="COMPLETE"
            metric={`${storiesPassed}/${stories.length} passing`}
          />

          <Connector active={phase === "complete"} color="gold" />

          {/* Output node */}
          <PipelineNode active={phase === "complete"} color="gold">
            <div className="node-icon">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M9 12l2 2 4-4" />
                <circle cx="12" cy="12" r="9" />
              </svg>
            </div>
            <div>
              <div className="node-title">Complete</div>
              <div className="node-sub">All stories verified</div>
            </div>
          </PipelineNode>

          {/* Memory layer */}
          <div className="memory-layer">
            <span className="section-tag">PERSISTENT MEMORY</span>
            <div className="memory-grid">
              {[
                { name: "spec.json", desc: "stories + status" },
                { name: "progress.md", desc: "learnings journal" },
                { name: "guardrails.md", desc: "failure signs" },
                { name: "git history", desc: "commit record" },
              ].map((m) => (
                <div key={m.name} className="mem-chip">
                  <span className="mem-name">{m.name}</span>
                  <span className="mem-desc">{m.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Right column */}
        <div className="right-col">
          {/* Stories */}
          <motion.div
            className="panel stories-panel"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="panel-header">
              <span className="section-tag">STORIES</span>
              <span className="panel-meta">{storiesPassed}/{stories.length} complete</span>
            </div>
            <div className="story-list">
              <AnimatePresence>
                {stories.map((story) => (
                  <motion.div
                    key={story.id}
                    className={`story-row ${story.passes ? "s-pass" : story.refined ? "s-refined" : "s-pending"}`}
                    layout
                    transition={{ duration: 0.3 }}
                  >
                    <div className="story-indicator">
                      {story.passes ? (
                        <motion.svg
                          viewBox="0 0 16 16" width="14" height="14"
                          initial={{ scale: 0 }} animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 400 }}
                        >
                          <circle cx="8" cy="8" r="7" fill="none" stroke="var(--clr-gold)" strokeWidth="1.5" />
                          <path d="M5 8l2 2 4-4" fill="none" stroke="var(--clr-gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </motion.svg>
                      ) : story.refined ? (
                        <motion.svg
                          viewBox="0 0 16 16" width="14" height="14"
                          initial={{ scale: 0 }} animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 400 }}
                        >
                          <circle cx="8" cy="8" r="7" fill="none" stroke="var(--clr-cyan)" strokeWidth="1.5" />
                          <circle cx="8" cy="8" r="2.5" fill="var(--clr-cyan)" />
                        </motion.svg>
                      ) : (
                        <svg viewBox="0 0 16 16" width="14" height="14">
                          <circle cx="8" cy="8" r="7" fill="none" stroke="var(--dim)" strokeWidth="1" />
                        </svg>
                      )}
                    </div>
                    <span className="story-id-tag">{story.id}</span>
                    <span className="story-name">{story.title}</span>
                    <div className="story-flags">
                      {story.refined && <span className="flag flag-cyan">R</span>}
                      {story.passes && <span className="flag flag-gold">P</span>}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Terminal log */}
          <motion.div
            className="panel terminal"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="panel-header">
              <span className="section-tag">TERMINAL</span>
              {running && (
                <motion.span
                  className="live-dot"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  LIVE
                </motion.span>
              )}
            </div>
            <div className="terminal-body" ref={logRef}>
              {log.length === 0 ? (
                <div className="terminal-idle">
                  <span className="prompt-char">&gt;</span> Ready. Press{" "}
                  <kbd>START</kbd> to begin autonomous loop.
                </div>
              ) : (
                log.map((entry, i) => (
                  <motion.div
                    key={`${i}-${entry}`}
                    className={`term-line ${entry.includes("═══") ? "term-header" : ""} ${entry.includes("✓") ? "term-success" : ""} ${entry.includes("⚡") ? "term-hook" : ""} ${entry.includes("<promise>") ? "term-promise" : ""}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.15 }}
                  >
                    {entry || "\u00A0"}
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>

          {/* Controls */}
          <div className="controls">
            <button className="cta" onClick={runLoop} disabled={running}>
              <span className="cta-inner">
                {running ? (
                  <>
                    <motion.span
                      className="cta-spinner"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      ◌
                    </motion.span>
                    RUNNING
                  </>
                ) : (
                  <>
                    <span className="cta-play">▶</span>
                    START SPEC LOOP
                  </>
                )}
              </span>
            </button>
            <button className="cta cta-ghost" onClick={reset}>
              RESET
            </button>
          </div>
        </div>
      </div>

      <footer>
        <div className="footer-links">
          <a href="https://github.com/skillhub-club/specloop" target="_blank" rel="noopener">
            github/specloop
          </a>
          <span className="footer-sep">/</span>
          <a href="https://github.com/snarktank/ralph" target="_blank" rel="noopener">
            inspired by ralph
          </a>
        </div>
        <div className="footer-install">
          <code>/plugin install skillhub-club/specloop</code>
        </div>
      </footer>
    </div>
  );
}

/* ── Sub-components ── */

function PipelineNode({
  active,
  color,
  children,
}: {
  active: boolean;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      className={`p-node ${active ? "p-active" : ""}`}
      data-color={color}
      animate={{
        borderColor: active ? `var(--clr-${color})` : "var(--border)",
      }}
      transition={{ duration: 0.3 }}
    >
      {children}
      {active && <div className="node-glow" data-color={color} />}
    </motion.div>
  );
}

function PhaseCard({
  phase,
  currentPhase,
  title,
  label,
  color,
  steps,
  activeStep,
  promise,
  metric,
}: {
  phase: string;
  currentPhase: Phase;
  title: string;
  label: string;
  color: "cyan" | "magenta";
  steps: string[];
  activeStep: number;
  promise: string;
  metric: string;
}) {
  const isActive = currentPhase === phase;
  const isPast =
    (phase === "spec-refine" && (currentPhase === "transition" || currentPhase === "implement" || currentPhase === "complete")) ||
    (phase === "implement" && currentPhase === "complete");

  return (
    <motion.div
      className={`phase-card ${isActive ? "pc-active" : ""} ${isPast ? "pc-done" : ""}`}
      data-color={color}
      animate={{
        borderColor: isActive ? `var(--clr-${color})` : isPast ? `var(--clr-${color})40` : "var(--border)",
      }}
    >
      {isActive && (
        <motion.div
          className="pc-glow-bar"
          data-color={color}
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}
      <div className="pc-top">
        <span className="pc-label" data-color={color}>{label}</span>
        <span className="pc-metric">{metric}</span>
      </div>
      <h3 className="pc-title">{title}</h3>
      <div className="pc-steps">
        {steps.map((step, i) => (
          <div
            key={i}
            className={`pc-step ${i === activeStep ? "pcs-active" : ""} ${i < activeStep ? "pcs-done" : ""}`}
            data-color={color}
          >
            <span className="pcs-marker">
              {i < activeStep ? "✓" : i === activeStep ? "▸" : String(i + 1).padStart(2, "0")}
            </span>
            <span>{step}</span>
          </div>
        ))}
      </div>
      <div className="pc-exit">
        EXIT <code>&lt;promise&gt;{promise}&lt;/promise&gt;</code>
      </div>
    </motion.div>
  );
}

function Connector({
  active,
  color,
  label,
}: {
  active: boolean;
  color: string;
  label?: string;
}) {
  return (
    <div className="connector" data-active={active} data-color={color}>
      <div className="conn-line" />
      {active && (
        <motion.div
          className="conn-pulse"
          data-color={color}
          animate={{ top: ["0%", "100%"] }}
          transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
        />
      )}
      <div className="conn-arrow">▾</div>
      {label && (
        <motion.span
          className="conn-label"
          data-color={color}
          initial={{ opacity: 0, x: -5 }}
          animate={{ opacity: active ? 1 : 0, x: active ? 0 : -5 }}
        >
          {label}
        </motion.span>
      )}
    </div>
  );
}

export default App;
