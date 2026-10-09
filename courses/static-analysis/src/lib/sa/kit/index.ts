/**
 * The course kit as importable modules, keyed by the name a rule uses to import them
 * (`import { areEquivalent } from '../helpers/equivalence.js'` → `equivalence`).
 */
import * as ast from './ast.js';
import * as ancestor from './ancestor.js';
import * as collection from './collection.js';
import * as decorators from './decorators.js';
import * as equivalence from './equivalence.js';
import * as generateMeta from './generate-meta.js';
import * as location from './location.js';
import * as lva from './lva.js';
import * as module from './module.js';
import * as parserServices from './parser-services.js';
import * as reachingDefinitions from './reaching-definitions.js';
import * as regex from './regex.js';
import * as type from './type.js';

export const KIT_MODULES: Record<string, unknown> = {
  ast,
  ancestor,
  collection,
  decorators,
  equivalence,
  'generate-meta': generateMeta,
  location,
  lva,
  module,
  'parser-services': parserServices,
  'reaching-definitions': reachingDefinitions,
  regex,
  type,
};
