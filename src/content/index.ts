import domains from '../../content/domains.json';
import course from '../../content/course.json';
import focus from '../../content/focus.json';
import glossary from '../../content/glossary.json';
import needsImprovement from '../../content/needs-improvement.json';
import practiceSets from '../../content/practice-sets.json';
import { loadContent, rawFromGlob } from './loader';

const modules = import.meta.glob('../../content/*/*.json', { eager: true, import: 'default' });

export const content = loadContent(rawFromGlob(domains, modules, glossary, course, focus, practiceSets, needsImprovement));
