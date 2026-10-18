import { z } from 'zod';
import {
  CardSchema,
  CourseFileSchema,
  DomainsFileSchema,
  FocusFileSchema,
  GlossaryFileSchema,
  PracticeSetFileSchema,
  LessonSchema,
  QuestionSchema,
  type Card,
  type Content,
  type CourseSection,
  type Domain,
  type FocusArea,
  type GlossaryTerm,
  type PracticeSet,
  type Lesson,
  type Question,
} from './schema';

export interface RawContent {
  domains: unknown;
  /** content/glossary.json; optional so fixtures and older callers can omit it. */
  glossary?: unknown;
  /** content/course.json; optional like the glossary. */
  course?: unknown;
  /** content/focus.json; optional like the glossary. */
  focus?: unknown;
  /** content/practice-sets.json; optional like the glossary. */
  practiceSets?: unknown;
  /** Keyed by "<domain-id>/<questions|cards|lessons>.json". */
  files: Record<string, unknown>;
}

export type ValidationResult = { ok: true; content: Content } | { ok: false; errors: string[] };

const KINDS = ['questions', 'cards', 'lessons'] as const;
const FILE_RE = /^([^/]+)\/([^/]+)\.json$/;

function zodErrors(file: string, error: z.ZodError): string[] {
  return error.issues.map((i) => `${file}: ${i.path.join('.') || '(root)'}: ${i.message}`);
}

export function buildContent(
  domains: Domain[], questions: Question[], cards: Card[], lessons: Lesson[], glossary: GlossaryTerm[] = [], course: CourseSection[] = [],
  focus: FocusArea[] = [],
  practiceSets: PracticeSet[] = [],
): Content {
  return {
    domains,
    questions,
    cards,
    lessons,
    glossary,
    course,
    focus,
    practiceSets,
    domainById: new Map(domains.map((d) => [d.id, d])),
    questionById: new Map(questions.map((q) => [q.id, q])),
    cardById: new Map(cards.map((c) => [c.id, c])),
    lessonById: new Map(lessons.map((l) => [l.id, l])),
    termById: new Map(glossary.map((t) => [t.id, t])),
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
    const seenChecks = new Set<string>();
    for (const id of item.checkQuestionIds) {
      if (seenChecks.has(id)) errors.push(`${file}: ${item.id} repeats check question "${id}"`);
      seenChecks.add(id);
      const q = questions.find((x) => x.item.id === id)?.item;
      if (q && q.subSkillId !== item.subSkillId) {
        errors.push(`${file}: ${item.id} check question "${id}" is in sub-skill "${q.subSkillId}", not "${item.subSkillId}"`);
      }
    }
  }

  for (const domain of domains) {
    // Balance applies to single-answer questions; multiple-response keys are spread by construction.
    const inDomain = questions.filter((q) => q.item.domainId === domain.id && typeof q.item.answer === 'string').map((q) => q.item);
    if (inDomain.length < 8) continue;
    for (const letter of ['a', 'b', 'c', 'd'] as const) {
      const n = inDomain.filter((q) => q.answer === letter).length;
      if (n / inDomain.length > 0.4) {
        errors.push(`${domain.id}: ${n} of ${inDomain.length} questions have answer "${letter}" (max 40%)`);
      }
    }
  }

  let glossary: GlossaryTerm[] = [];
  if (raw.glossary !== undefined) {
    const parsed = GlossaryFileSchema.safeParse(raw.glossary);
    if (!parsed.success) errors.push(...zodErrors('glossary.json', parsed.error));
    else {
      glossary = parsed.data;
      const owner = new Map<string, string>();
      for (const t of glossary) {
        if (seen.has(t.id)) errors.push(`glossary.json: duplicate id "${t.id}"`);
        seen.add(t.id);
        for (const name of [t.term, ...t.aliases]) {
          const key = name.toLowerCase();
          const prev = owner.get(key);
          if (prev && prev !== t.id) errors.push(`glossary.json: "${name}" is claimed by both ${prev} and ${t.id}`);
          owner.set(key, t.id);
        }
      }
    }
  }

  let course: CourseSection[] = [];
  if (raw.course !== undefined) {
    const parsed = CourseFileSchema.safeParse(raw.course);
    if (!parsed.success) errors.push(...zodErrors('course.json', parsed.error));
    else {
      course = parsed.data;
      const sectionIds = new Set<string>();
      for (const s of course) {
        if (sectionIds.has(s.id)) errors.push(`course.json: duplicate section id "${s.id}"`);
        sectionIds.add(s.id);
        for (const m of s.modules) if (!lessonIds.has(m.lessonId)) errors.push(`course.json: ${s.id} links unknown lesson "${m.lessonId}"`);
      }
    }
  }

  let focus: FocusArea[] = [];
  if (raw.focus !== undefined) {
    const parsed = FocusFileSchema.safeParse(raw.focus);
    if (!parsed.success) errors.push(...zodErrors('focus.json', parsed.error));
    else {
      focus = parsed.data;
      const areaIds = new Set<string>();
      for (const a of focus) {
        if (areaIds.has(a.id)) errors.push(`focus.json: duplicate area id "${a.id}"`);
        areaIds.add(a.id);
        const inArea = new Set<string>();
        for (const id of a.questionIds) {
          if (!questionIds.has(id)) errors.push(`focus.json: ${a.id} links unknown question "${id}"`);
          if (inArea.has(id)) errors.push(`focus.json: ${a.id} repeats question "${id}"`);
          inArea.add(id);
        }
      }
    }
  }

  let practiceSets: PracticeSet[] = [];
  if (raw.practiceSets !== undefined) {
    const parsed = PracticeSetFileSchema.safeParse(raw.practiceSets);
    if (!parsed.success) errors.push(...zodErrors('practice-sets.json', parsed.error));
    else {
      practiceSets = parsed.data;
      for (const s of practiceSets) {
        if (seen.has(s.id)) errors.push(`practice-sets.json: duplicate id "${s.id}"`);
        seen.add(s.id);
        for (const q of s.questions) {
          if (seen.has(q.id)) errors.push(`practice-sets.json: ${s.id} duplicate id "${q.id}"`);
          seen.add(q.id);
          if (!domainById.has(q.domainId)) errors.push(`practice-sets.json: ${q.id} has unknown domainId "${q.domainId}"`);
          const ids = q.choices.map((c) => c.id);
          const answers = typeof q.answer === 'string' ? [q.answer] : q.answer;
          if (answers.some((a) => !ids.includes(a))) errors.push(`practice-sets.json: ${q.id} answer is not a choice`);
        }
      }
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    content: buildContent(
      domains,
      questions.map((q) => q.item),
      cards.map((c) => c.item),
      lessons.map((l) => l.item),
      glossary,
      course,
      focus,
      practiceSets,
    ),
  };
}
