// Minimal React hooks runtime for testing useAsyncData's control flow.
// Implements just enough of useState/useRef/useCallback/useEffect with
// correct hook ordering, effect deps comparison, and cleanup semantics.
let currentInstance = null;

const depsChanged = (a, b) => {
  if (!a || !b || a.length !== b.length) return true;
  return a.some((d, i) => !Object.is(d, b[i]));
};

export function useState(initial) {
  const inst = currentInstance;
  const idx = inst.cursor++;
  if (!(idx in inst.slots)) inst.slots[idx] = initial;
  const setState = (value) => {
    inst.slots[idx] =
      typeof value === "function" ? value(inst.slots[idx]) : value;
  };
  return [inst.slots[idx], setState];
}

export function useRef(initial) {
  const inst = currentInstance;
  const idx = inst.cursor++;
  if (!(idx in inst.slots)) inst.slots[idx] = { current: initial };
  return inst.slots[idx];
}

export function useCallback(fn) {
  return fn;
}

export function useEffect(fn, deps) {
  const inst = currentInstance;
  const idx = inst.cursor++;
  inst.pendingEffects.push({ idx, fn, deps });
}

function flushEffects(inst) {
  for (const { idx, fn, deps } of inst.pendingEffects) {
    const prev = inst.effects[idx];
    if (!prev || depsChanged(prev.deps, deps)) {
      if (prev && typeof prev.cleanup === "function") prev.cleanup();
      const cleanup = fn();
      inst.effects[idx] = { fn, deps, cleanup };
    }
  }
  inst.pendingEffects = [];
}

function runCleanups(inst) {
  for (const e of inst.effects) {
    if (e && typeof e.cleanup === "function") e.cleanup();
  }
  inst.effects = [];
}

export function renderHook(hookFn, initialArgs) {
  const inst = {
    slots: [],
    effects: [],
    pendingEffects: [],
    cursor: 0,
    args: initialArgs,
    result: undefined,
  };
  const doRender = () => {
    currentInstance = inst;
    inst.cursor = 0;
    try {
      inst.result = hookFn(...inst.args);
    } finally {
      currentInstance = null;
    }
    flushEffects(inst);
  };
  doRender();
  return {
    get result() {
      return inst.result;
    },
    rerender: (args = inst.args) => {
      inst.args = args;
      doRender();
    },
    // StrictMode-style: run every cleanup, then re-run every effect,
    // preserving original hook indices.
    reinvokeEffects: () => {
      const entries = inst.effects
        .map((e, idx) => (e ? { e, idx } : null))
        .filter(Boolean);
      runCleanups(inst);
      currentInstance = inst;
      try {
        for (const { e, idx } of entries) {
          const cleanup = e.fn();
          inst.effects[idx] = { fn: e.fn, deps: e.deps, cleanup };
        }
      } finally {
        currentInstance = null;
      }
    },
    unmount: () => runCleanups(inst),
  };
}
