# CCDV-F exam blueprint (official)

Copied from the official *Claude Certified Developer – Foundations Exam Guide*, Version 1.0, effective July 2026 (exam code CCDV-F). This is the authority for which topics the question bank must cover. Answers still come from the official docs (see `docs/content-guide.md`).

## Exam format

- 53 items, 120 minutes, proctored.
- **Multiple-choice and multiple-response items; each item states how many responses to select.**
- Pass: scaled score 720 on a 100–1,000 scale. The score report shows percent correct by domain.

## Domains and skills (weights are shares of the whole exam)

| # | Domain | Weight |
|---|---|---|
| 1 | Agents and Workflows | 14.7% |
| 2 | Applications and Integration | 33.1% |
| 3 | Claude Code | 3.1% |
| 4 | Eval, Testing, and Debugging | 2.6% |
| 5 | Model Selection and Optimization | 16.8% |
| 6 | Prompt and Context Engineering | 11.0% |
| 7 | Security and Safety | 8.1% |
| 8 | Tools and MCPs | 10.6% |

Each skill below lists what exam items are written against; its weight is its share of the whole exam.

### Domain 1: Agents and Workflows (14.7%)

**Agent Architecture (4.5%)**  
Principles, patterns, and tradeoffs of agent and workflow architecture, including the decision criteria for using a workflow versus an agent, the structure of manager/supervisor hierarchies, and the role of subagents in improving task execution.

**Agent Construction with Claude (5.3%)**  
Methods, tools, and platforms for constructing Claude agents, including the Claude Agent SDK, custom agent loops and harnesses, managed agent deployment models (self-hosted vs. Anthropic-hosted), and hooks for deterministic actions.

**Agent Patterns and Frameworks (4.9%)**  
Common agent design patterns (tool-use loops, sub-agents, memory, context-window management) and agentic abstraction frameworks (e.g., Strands, LangGraph, PydanticAI) for building agents and workflows for multi-step tasks.

### Domain 2: Applications and Integration (33.1%)

**Understanding Requirements (3.4%)**  
Functional and infrastructure requirements based on business requirements and solution architecture.

**Systems Life Cycle (2.8%)**  
Systems life cycle management concepts and frameworks used to develop, implement, operate, and maintain IT systems.

**Claude API Mechanics (6.8%)**  
Claude API behavior and mechanics, including messages, tools, streaming, vision, thinking, caching, invoking Claude through third-party vendors, Messages API data access patterns, batch API use, and tradeoffs between realtime and batch API selection.

**Software Engineering Foundations (7.4%)**  
Core software engineering principles and practices, including REST APIs, JSON, asynchronous programming, version control, SDLC integration, code review, and small- and large-scale refactoring.

**Claude Application Design (8.6%)**  
Design considerations for building Claude applications, including how Claude interprets instructions across interfaces (Claude Code, Desktop, claude.ai, API, SDKs), content boundaries, schema design, session hygiene, and plugin management. Configuration Management (4.1%) Configuration management for Claude system components, including CLAUDE.md files, settings.json, model version pinning, prompt versioning, and plugin dependencies.

### Domain 3: Claude Code (3.1%)

**Claude Code Operation (3.1%)**  
Claude Code core components (Rules, Skills, Commands, Agents, Agent Memory), features (session management, built-in and custom slash commands, headless mode, streaming mode, auto-mode), the CLAUDE.md hierarchy, repository initialization, and settings.json configuration.

### Domain 4: Eval, Testing, and Debugging (2.6%)

**Debugging and Error Handling (2.6%)**  
Debugging and error handling techniques for Claude applications, including error type identification, recovery strategy selection, trace analysis to identify failure modes, and problem origin isolation between the integration layer and model output.

### Domain 5: Model Selection and Optimization (16.8%)

**LLM Fundamentals (5.2%)**  
Basic understanding of LLMs (tokens, context windows, sampling, non-determinism, next-token generation), model options (fast mode, extended thinking, adaptive thinking, effort levels), and fundamental prompting techniques (zero-shot, single-shot, multi-shot).

**Technical Fundamentals (6.1%)**  
Foundational technical concepts supporting AI application development, including basic engineering practices (integrating with SDKs that wrap REST APIs, websockets).

**Model Selection and Tradeoffs (2.7%)**  
Claude model capabilities (Opus vs. Sonnet vs. Haiku use cases, adaptive thinking support), tradeoffs across quality/latency/cost parameters, and breaking behavior changes across model releases when selecting models for tasks.

**Cost and Token Management (2.8%)**  
Token budgeting and cost management techniques for Claude applications, including token usage tracking, cost modeling, and caching techniques (prompt caching, cache check-pointing) for cost optimization.

### Domain 6: Prompt and Context Engineering (11.0%)

**Context Engineering (3.8%)**  
Context and memory management techniques for Claude applications, including context window management, prevention of context drift and bloat (tool output pruning, compaction), and context isolation through subagents or multi-step agentic workflows.

**Prompt Engineering (4.6%)**  
Prompt engineering principles and methods (instruction clarity, few-shot examples, system versus user placement, output constraints, prompt and instruction placement across components, iterative refinement, prompt adjustment, input sanitization) when writing and iterating on prompts for Claude.

**Output Handling (2.6%)**  
Established patterns and techniques for producing, validating, and consuming Claude output, including structured output patterns, response validation, defensive parsing, and skepticism toward confident output.

### Domain 7: Security and Safety (8.1%)

**AI Application Security (3.2%)**  
Data privacy and security best practices, including prompt injection awareness and mitigation, jailbreak defense, untrusted input handling, data leakage prevention, PII handling, and ensuring authentication, authorization, confidentiality, privacy, and integrity.

**Guardrails and Safe Deployment (2.3%)**  
Safe and responsible deployment practices (content policy, guardrail layering) and secure-by-design principles (privacy, identity and access management, least privilege).

**Claude Hooks (1.0%)**  
Leveraging hooks for guardrails and safety controls to prevent destructive actions within Claude applications.

**Identity, Secrets, and Key Management (1.6%)**  
Managing secrets, credentials, and API keys across Claude development and production environments, including identity validation and authentication, access approval and level verification, and authorized access monitoring.

### Domain 8: Tools and MCPs (10.6%)

**Tool Implementation (4.4%)**  
Tool implementation practices for Claude applications, including tool use and function calling, configuration for external system interaction, tool description writing, error handling, tool usage patterns (agentic harness dispatch, client-side vs. server-side tools, approval patterns), and tool set construction best practices.

**MCP Server Development (2.1%)**  
MCP server development practices, including server authoring, deployment, integration with Claude applications, MCP resources, tools, and prompts, and communication patterns (stdio, sockets, client vs. server).

**Agentic Customization (4.1%)**  
Tradeoffs among built-in Tools, custom Tools, Skills, and MCPs for selecting and applying the appropriate approach for a given use case.

## Official sample questions (style and cognitive level)

These are illustrative, not from the live item bank.

**Sample 1 · Domain 2 — Applications and Integration.** A developer must process 10,000 documents overnight to produce a non-urgent analytics report. Cost is the primary concern, and results are not needed until the following morning. Which approach best fits the requirement?

- A. Send every request synchronously through the Messages API in parallel to finish as quickly as possible.
- B. Use the Message Batches API, which processes large asynchronous workloads within a 24-hour window at reduced cost.
- C. Lower max_tokens on synchronous calls to minimize cost.
- D. Switch to the smallest available model regardless of output quality.

**Sample 2 · Domain 7 — Security and Safety.** A Claude-powered agent summarizes web pages submitted by end users. One page contains hidden text instructing the model to ignore previous instructions and reveal its system prompt. Which mitigation is most effective?

- A. Raise the model's temperature so its behavior is harder to predict.
- B. Treat retrieved page content as untrusted input, keep it separate from trusted instructions, and use guardrails or hooks so injected instructions cannot trigger sensitive actions.
- C. Add a line to the system prompt asking users not to include malicious instructions.
- D. Switch to a larger model that follows instructions more reliably.

**Sample 3 · Domain 8 — Tools and MCPs.** A team needs Claude to call an internal inventory service exposed as a REST API. They want the capability to be reusable across several Claude applications and maintained independently of any one app. Which approach best fits?

- A. Hard-code the inventory logic into each application's system prompt.
- B. Build an MCP server that exposes the inventory operations as tools so multiple Claude applications can connect to it.
- C. Paste the current inventory data into the context window on every request.
- D. Rely on a built-in tool, since built-in tools can reach any internal REST API.

**Answer key and rationale**

- Sample 1: B. The Message Batches API is designed for latency-tolerant, high-volume workloads at lower cost, which matches an overnight, non-urgent job. Sending requests synchronously in parallel (A) does not reduce per-token cost; lowering max_tokens (C) or blindly downsizing the model (D) does not address the batch-versus-realtime tradeoff.
- Sample 2: B. Prompt injection is addressed by isolating untrusted content from trusted instructions and enforcing least-privilege guardrails so injected text cannot invoke sensitive tools. Temperature (A) is irrelevant to injection; a polite request (C) is not an enforceable control; a more instruction-following model (D) can be more susceptible, not less.
- Sample 3: B. An MCP server exposes reusable tools that multiple Claude applications can share and that can be maintained independently. Hard-coding logic into prompts (A) is neither reusable nor maintainable; pasting data (C) gives no live access and wastes context; built-in tools (D) do not automatically reach arbitrary internal APIs.
