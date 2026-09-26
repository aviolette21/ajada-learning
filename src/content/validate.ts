import { z } from 'zod';
import {
  CardSchema,
  DomainsFileSchema,
  LessonSchema,
  QuestionSchema,
  type Card,
  type Content,
  type Domain,
  type Lesson,
  type Question,
} from './schema';

export interface RawContent {
  domains: unknown;
  /** Keyed by "<domain-id>/<questions|cards|lessons>.json". */
  files: Record<string, unknown>;
}

export type ValidationResult = { ok: true; content: Content } | { ok: false; errors: string[] };

const KINDS = ['questions', 'cards', 'lessons'] as const;
const FILE_RE = /^([^/]+)\/([^/]+)\.json$/;

function zodErrors(file: string, error: z.ZodError): string[] {
  return error.issues.map((i) => `${file}: ${i.path.join('.') || '(root)'}: ${i.message}`);
}

export function buildContent(domains: Domain[], questions: Question[], cards: Card[], lessons: Lesson[]): Content {
  return {
    domains,
    questions,
    cards,
    lessons,
    domainById: new Map(domains.map((d) => [d.id, d])),
    questionById: new Map(questions.map((q) => [q.id, q])),
    cardById: new Map(cards.map((c) => [c.id, c])),
    lessonById: new Map(lessons.map((l) => [l.id, l])),
  };
}

export function validateContent(raw: RawContent): ValidationResult {
  const parsedDomains = DomainsFileSchema.safeParse(raw.domains);
  if (!parsedDomains.success) return { ok: false, errors: zodErrors('domains.json', parsedDomains.error) };

  const errors: string[] = [];
  const domains = [...parsedDomains.data].sort((a, b) => a.order - b.order);
  const domainById = new Map(domains.map((d) => [d.id, d]));
  const weightSum = domains.reduce((sum, d) => sum + d.weight, 0);
  if (Math.abs(weightSum - 100) > 0.5) errors.push(`domains.json: weights sum to ${weightSum.toFixed(1)}, expected 100`);

  for (const file of Object.keys(raw.files)) {
    const m = FILE_RE.exec(file);
    if (!m || !(KINDS as readonly string[]).includes(m[2])) errors.push(`${file}: unexpected content file`);
    else if (!domainById.has(m[1])) errors.push(`${file}: folder "${m[1]}" is not a domain id`);
  }

  const questions: { file: string; item: Question }[] = [];
  const cards: { file: string; item: Card }[] = [];
  const lessons: { file: string; item: Lesson }[] = [];
  const seen = new Set<string>();

  for (const domain of domains) {
    for (const kind of KINDS) {
      const file = `${domain.id}/${kind}.json`;
      if (!(file in raw.files)) continue;
      const schema = kind === 'questions' ? QuestionSchema : kind === 'cards' ? CardSchema : LessonSchema;
      const parsed = z.array(schema).safeParse(raw.files[file]);
      if (!parsed.success) {
        errors.push(...zodErrors(file, parsed.error));
        continue;
      }
      for (const item of parsed.data) {
        if (seen.has(item.id)) errors.push(`${file}: duplicate id "${item.id}"`);
        seen.add(item.id);
        if (item.domainId !== domain.id) errors.push(`${file}: ${item.id} has domainId "${item.domainId}" but lives in "${domain.id}"`);
        if (!domain.subSkills.some((s) => s.id === item.subSkillId)) errors.push(`${file}: ${item.id} has unknown subSkillId "${item.subSkillId}"`);
      }
      if (kind === 'questions') questions.push(...(parsed.data as Question[]).map((item) => ({ file, item })));
      if (kind === 'cards') cards.push(...(parsed.data as Card[]).map((item) => ({ file, item })));
      if (kind === 'lessons') lessons.push(...(parsed.data as Lesson[]).map((item) => ({ file, item })));
    }
  }

  const cardIds = new Set(cards.map((c) => c.item.id));
  const lessonIds = new Set(lessons.map((l) => l.item.id));
  const questionIds = new Set(questions.map((q) => q.item.id));
  for (const { file, item } of questions) {
    for (const id of item.relatedCardIds) if (!cardIds.has(id)) errors.push(`${file}: ${item.id} links unknown card "${id}"`);
    if (item.lessonId && !lessonIds.has(item.lessonId)) errors.push(`${file}: ${item.id} links unknown lesson "${item.lessonId}"`);
  }
  for (const { file, item } of lessons) {
    for (const id of item.checkQuestionIds) if (!questionIds.has(id)) errors.push(`${file}: ${item.id} links unknown question "${id}"`);
  }

  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    content: buildContent(
      domains,
      questions.map((q) => q.item),
      cards.map((c) => c.item),
      lessons.map((l) => l.item),
    ),
  };
}
