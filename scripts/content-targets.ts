/** Questions per sub-skill ∝ published weight within each domain (largest remainder, min 3 for lesson checks). Cards = questions. */
const Q: Record<string, [domainId: string, questions: number]> = {
  requirements: ['apps-integration', 5],
  'systems-lifecycle': ['apps-integration', 4],
  'api-mechanics': ['apps-integration', 11],
  'swe-foundations': ['apps-integration', 11],
  'app-design': ['apps-integration', 13],
  'config-management': ['apps-integration', 6],
  'llm-fundamentals': ['model-selection', 8],
  'technical-fundamentals': ['model-selection', 9],
  'model-tradeoffs': ['model-selection', 4],
  'cost-tokens': ['model-selection', 4],
  'agent-architecture': ['agents-workflows', 7],
  'agent-construction': ['agents-workflows', 8],
  'agent-patterns': ['agents-workflows', 7],
  'context-engineering': ['prompt-context', 6],
  'prompt-engineering': ['prompt-context', 7],
  'output-handling': ['prompt-context', 4],
  'tool-implementation': ['tools-mcp', 7],
  'mcp-server-dev': ['tools-mcp', 3],
  'agentic-customisation': ['tools-mcp', 6],
  'app-security': ['security-safety', 4],
  guardrails: ['security-safety', 3],
  'claude-hooks': ['security-safety', 3],
  'secrets-keys': ['security-safety', 3],
  'cc-operation': ['claude-code', 6],
  'debugging-errors': ['eval-testing', 6],
};

export const SUBSKILL_TARGETS: Record<string, { domainId: string; questions: number; cards: number }> =
  Object.fromEntries(Object.entries(Q).map(([id, [domainId, n]]) => [id, { domainId, questions: n, cards: n }]));
