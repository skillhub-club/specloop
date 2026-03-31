import { useState } from "react";
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
  "Read spec.json + codebase",
  "Identify vague criteria",
  "Rewrite to be verifiable",
  "Add validationCommand",
  "Mark refined: true",
];

const STEPS_PHASE2 = [
  "Read guardrails.md first",
  "Pick highest-priority story",
  "Implement + test",
  "Commit changes",
  "Record learnings",
];

function App() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [iteration, setIteration] = useState(0);
  const [activeStep, setActiveStep] = useState(-1);
  const [stories, setStories] = useState<Story[]>(INITIAL_STORIES);
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const addLog = (msg: string) => setLog((prev) => [...prev.slice(-12), msg]);

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const runLoop = async () => {
    setRunning(true);
    setLog([]);
    setStories(INITIAL_STORIES.map((s) => ({ ...s })));

    // Phase 1: Spec Refinement
    setPhase("spec-refine");
    addLog("🔄 Phase 1: Spec Refinement started");

    for (let i = 0; i < INITIAL_STORIES.length; i++) {
      setIteration(i + 1);
      addLog(`── Iteration ${i + 1}: Refining ${INITIAL_STORIES[i].id}`);

      for (let step = 0; step < STEPS_PHASE1.length; step++) {
        setActiveStep(step);
        await sleep(400);
      }
      setActiveStep(-1);

      setStories((prev) =>
        prev.map((s, idx) => (idx === i ? { ...s, refined: true } : s))
      );
      addLog(`   ✓ ${INITIAL_STORIES[i].id} refined`);
      await sleep(300);
    }

    addLog("✅ <promise>SPEC_COMPLETE</promise>");
    await sleep(600);

    // Transition
    setPhase("transition");
    addLog("⚡ Stop hook: transitioning to Phase 2...");
    await sleep(1000);

    // Phase 2: Implementation
    setPhase("implement");
    addLog("🔄 Phase 2: Implementation started");

    for (let i = 0; i < INITIAL_STORIES.length; i++) {
      setIteration(i + 1);
      addLog(`── Iteration ${i + 1}: Implementing ${INITIAL_STORIES[i].id}`);

      for (let step = 0; step < STEPS_PHASE2.length; step++) {
        setActiveStep(step);
        await sleep(500);
      }
      setActiveStep(-1);

      setStories((prev) =>
        prev.map((s, idx) => (idx === i ? { ...s, passes: true } : s))
      );
      addLog(`   ✓ ${INITIAL_STORIES[i].id} passes`);
      await sleep(300);
    }

    addLog("✅ <promise>COMPLETE</promise>");
    await sleep(400);
    setPhase("complete");
    addLog("🎉 Spec Loop complete — all stories passing!");
    setRunning(false);
  };

  const reset = () => {
    setPhase("idle");
    setIteration(0);
    setActiveStep(-1);
    setStories(INITIAL_STORIES.map((s) => ({ ...s })));
    setLog([]);
    setRunning(false);
  };

  return (
    <div className="app">
      <header>
        <h1>
          <span className="logo">⟳</span> Spec Loop
        </h1>
        <p className="subtitle">
          Two-phase autonomous AI loop: refine specs → implement iteratively
        </p>
      </header>

      <div className="main-layout">
        {/* Left: Flow diagram */}
        <div className="flow-column">
          <div className="flow-container">
            {/* Start node */}
            <FlowNode
              label="spec.json"
              icon="📋"
              description="Stories + acceptance criteria"
              active={phase !== "idle" && phase !== "complete"}
              type="file"
            />
            <Arrow active={phase === "spec-refine"} />

            {/* Phase 1 */}
            <PhaseBox
              title="Phase 1: Spec Refinement"
              steps={STEPS_PHASE1}
              active={phase === "spec-refine"}
              activeStep={phase === "spec-refine" ? activeStep : -1}
              promise="SPEC_COMPLETE"
              color="blue"
            />
            <Arrow active={phase === "transition"} label="Stop hook → Phase 2" />

            {/* Phase 2 */}
            <PhaseBox
              title="Phase 2: Implementation"
              steps={STEPS_PHASE2}
              active={phase === "implement"}
              activeStep={phase === "implement" ? activeStep : -1}
              promise="COMPLETE"
              color="green"
            />
            <Arrow active={phase === "complete"} />

            {/* Complete */}
            <FlowNode
              label="All Stories Pass"
              icon="✅"
              description="Commits + learnings recorded"
              active={phase === "complete"}
              type="complete"
            />
          </div>

          {/* Memory sidebar */}
          <div className="memory-strip">
            <h3>Memory Between Iterations</h3>
            <div className="memory-items">
              <MemoryItem icon="📋" label="spec.json" desc="Stories + status" />
              <MemoryItem icon="📝" label="progress.md" desc="Learnings journal" />
              <MemoryItem icon="🛡" label="guardrails.md" desc="Failure signs" />
              <MemoryItem icon="📦" label="git history" desc="Implementation record" />
            </div>
          </div>
        </div>

        {/* Right: Stories + Log */}
        <div className="status-column">
          {/* Stories panel */}
          <div className="panel stories-panel">
            <h3>Stories</h3>
            <div className="story-list">
              {stories.map((story) => (
                <motion.div
                  key={story.id}
                  className={`story-item ${story.passes ? "done" : story.refined ? "refined" : ""}`}
                  layout
                  animate={{
                    backgroundColor: story.passes
                      ? "rgba(34,197,94,0.15)"
                      : story.refined
                        ? "rgba(59,130,246,0.15)"
                        : "rgba(255,255,255,0.05)",
                  }}
                >
                  <span className="story-check">
                    {story.passes ? "✓" : story.refined ? "◆" : "○"}
                  </span>
                  <span className="story-id">{story.id}</span>
                  <span className="story-title">{story.title}</span>
                  <span className="story-badges">
                    {story.refined && (
                      <span className="badge badge-blue">refined</span>
                    )}
                    {story.passes && (
                      <span className="badge badge-green">passes</span>
                    )}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Log panel */}
          <div className="panel log-panel">
            <h3>
              Loop Output
              {running && (
                <span className="iteration-badge">
                  Iteration {iteration}
                </span>
              )}
            </h3>
            <div className="log-content">
              <AnimatePresence>
                {log.map((entry, i) => (
                  <motion.div
                    key={i}
                    className="log-entry"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {entry}
                  </motion.div>
                ))}
              </AnimatePresence>
              {log.length === 0 && (
                <div className="log-empty">
                  Press Start to run the Spec Loop demo
                </div>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="controls">
            <button
              className="btn btn-primary"
              onClick={runLoop}
              disabled={running}
            >
              {running ? "Running..." : "▶ Start Spec Loop"}
            </button>
            <button className="btn btn-secondary" onClick={reset}>
              ↺ Reset
            </button>
          </div>
        </div>
      </div>

      <footer>
        <a href="https://github.com/skillhub-club/specloop" target="_blank">
          GitHub
        </a>
        <span>·</span>
        <span>
          Inspired by{" "}
          <a href="https://github.com/snarktank/ralph" target="_blank">
            Ralph Loop
          </a>
        </span>
      </footer>
    </div>
  );
}

// --- Components ---

function FlowNode({
  label,
  icon,
  description,
  active,
  type,
}: {
  label: string;
  icon: string;
  description: string;
  active: boolean;
  type: "file" | "complete";
}) {
  return (
    <motion.div
      className={`flow-node flow-node-${type} ${active ? "active" : ""}`}
      animate={{
        scale: active ? 1.05 : 1,
        boxShadow: active
          ? "0 0 20px rgba(99,102,241,0.4)"
          : "0 0 0 transparent",
      }}
    >
      <span className="flow-icon">{icon}</span>
      <div>
        <div className="flow-label">{label}</div>
        <div className="flow-desc">{description}</div>
      </div>
    </motion.div>
  );
}

function PhaseBox({
  title,
  steps,
  active,
  activeStep,
  promise,
  color,
}: {
  title: string;
  steps: string[];
  active: boolean;
  activeStep: number;
  promise: string;
  color: "blue" | "green";
}) {
  return (
    <motion.div
      className={`phase-box phase-${color} ${active ? "active" : ""}`}
      animate={{
        borderColor: active
          ? color === "blue"
            ? "#3b82f6"
            : "#22c55e"
          : "rgba(255,255,255,0.1)",
      }}
    >
      <div className="phase-header">{title}</div>
      <div className="phase-steps">
        {steps.map((step, i) => (
          <div
            key={i}
            className={`phase-step ${i === activeStep ? "step-active" : ""} ${i < activeStep ? "step-done" : ""}`}
          >
            <span className="step-num">
              {i < activeStep ? "✓" : i === activeStep ? "►" : (i + 1)}
            </span>
            {step}
          </div>
        ))}
      </div>
      <div className="phase-promise">
        Exit: <code>&lt;promise&gt;{promise}&lt;/promise&gt;</code>
      </div>
      {active && (
        <motion.div
          className="phase-pulse"
          animate={{ opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}
    </motion.div>
  );
}

function Arrow({ active, label }: { active: boolean; label?: string }) {
  return (
    <div className={`arrow ${active ? "arrow-active" : ""}`}>
      <div className="arrow-line" />
      <div className="arrow-head">▼</div>
      {label && <span className="arrow-label">{label}</span>}
    </div>
  );
}

function MemoryItem({
  icon,
  label,
  desc,
}: {
  icon: string;
  label: string;
  desc: string;
}) {
  return (
    <div className="memory-item">
      <span>{icon}</span>
      <div>
        <strong>{label}</strong>
        <small>{desc}</small>
      </div>
    </div>
  );
}

export default App;
