/**
 * Questions per sub-skill ≈ 5.2 × the published sub-skill weight (about 530 in all, enough for ten mock exams without
 * repeats), with a floor of 12 so every sub-skill can be drilled. Cards stay at the first bank's size: the app is
 * practice-question first, and cards are a supplement.
 */
const Q: Record<string, [domainId: string, questions: number, cards: number]> = {
  requirements: ['apps-integration', 18, 5],
  'systems-lifecycle': ['apps-integration', 15, 4],
  'api-mechanics': ['apps-integration', 35, 11],
  'swe-foundations': ['apps-integration', 38, 11],
  'app-design': ['apps-integration', 45, 13],
  'config-management': ['apps-integration', 21, 6],
  'llm-fundamentals': ['model-selection', 27, 8],
  'technical-fundamentals': ['model-selection', 32, 9],
  'model-tradeoffs': ['model-selection', 14, 4],
  'cost-tokens': ['model-selection', 15, 4],
  'agent-architecture': ['agents-workflows', 23, 7],
  'agent-construction': ['agents-workflows', 28, 8],
  'agent-patterns': ['agents-workflows', 25, 7],
  'context-engineering': ['prompt-context', 20, 6],
  'prompt-engineering': ['prompt-context', 24, 7],
  'output-handling': ['prompt-context', 14, 4],
  'tool-implementation': ['tools-mcp', 23, 7],
  'mcp-server-dev': ['tools-mcp', 12, 3],
  'agentic-customisation': ['tools-mcp', 21, 6],
  'app-security': ['security-safety', 17, 4],
  guardrails: ['security-safety', 12, 3],
  'claude-hooks': ['security-safety', 12, 3],
  'secrets-keys': ['security-safety', 12, 3],
  'cc-operation': ['claude-code', 16, 6],
  'debugging-errors': ['eval-testing', 14, 6],
};

export const SUBSKILL_TARGETS: Record<string, { domainId: string; questions: number; cards: number }> =
  Object.fromEntries(Object.entries(Q).map(([id, [domainId, questions, cards]]) => [id, { domainId, questions, cards }]));
