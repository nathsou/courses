/**
 * A backtracking regular-expression matcher over regexpp's tree, instrumented to count its steps. It follows the
 * same strategy as JavaScript's engines (try alternatives and repetitions in order, back up on failure), so its
 * step counts grow the way theirs do: linearly for most patterns, polynomially or exponentially for ambiguous
 * ones (chapter 11). It supports what the course's examples need: characters, classes, `.`, `\d \w \s`, groups,
 * alternation, greedy and lazy quantifiers, `^ $ \b \B`, lookaheads and backreferences.
 */
import { RegExpParser, type AST } from '@eslint-community/regexpp';

export class StepLimit extends Error {}
export class Unsupported extends Error {}

export interface MatchResult {
  matched: boolean;
  steps: number;
}

type K = (pos: number) => boolean;

function charSetMatches(set: AST.CharacterSet, c: string): boolean {
  let r: boolean;
  switch (set.kind) {
    case 'any':
      return c !== '\n' && c !== '\r' && c !== ' ' && c !== ' ';
    case 'digit':
      r = /\d/.test(c);
      break;
    case 'space':
      r = /\s/.test(c);
      break;
    case 'word':
      r = /\w/.test(c);
      break;
    default:
      throw new Unsupported(`\\p{…} is not supported here`);
  }
  return set.negate ? !r : r;
}

function classMatches(cls: AST.CharacterClass, c: string, ignoreCase: boolean): boolean {
  const code = c.codePointAt(0)!;
  const alt = ignoreCase ? (c === c.toLowerCase() ? c.toUpperCase() : c.toLowerCase()).codePointAt(0)! : code;
  let r = false;
  for (const e of cls.elements) {
    if (e.type === 'Character') r = e.value === code || e.value === alt;
    else if (e.type === 'CharacterClassRange') r = (e.min.value <= code && code <= e.max.value) || (e.min.value <= alt && alt <= e.max.value);
    else if (e.type === 'CharacterSet') r = charSetMatches(e, c);
    else throw new Unsupported('nested classes are not supported here');
    if (r) break;
  }
  return cls.negate ? !r : r;
}

/** Runs `pattern` (with `flags`) on `input` the way a backtracking engine would, counting steps up to `limit`. */
export function backtrack(literal: AST.RegExpLiteral, input: string, limit = 1_000_000): MatchResult {
  const ignoreCase = literal.flags.ignoreCase;
  const captures = new Map<number, [number, number]>();
  const groupIndex = new Map<AST.CapturingGroup, number>();
  let n = 0;
  const visitGroups = (node: AST.Node) => {
    if (node.type === 'CapturingGroup') groupIndex.set(node, ++n);
    for (const child of children(node)) visitGroups(child);
  };
  visitGroups(literal.pattern);

  let steps = 0;
  const step = () => {
    if (++steps > limit) throw new StepLimit();
  };
  const isWord = (i: number) => i >= 0 && i < input.length && /\w/.test(input[i]!);

  function alternatives(alts: AST.Alternative[], pos: number, k: K): boolean {
    for (const alt of alts) if (sequence(alt.elements, 0, pos, k)) return true;
    return false;
  }

  function sequence(elements: AST.Element[], i: number, pos: number, k: K): boolean {
    if (i === elements.length) return k(pos);
    return element(elements[i]!, pos, (p) => sequence(elements, i + 1, p, k));
  }

  function element(e: AST.Element, pos: number, k: K): boolean {
    switch (e.type) {
      case 'Character': {
        step();
        const c = input[pos];
        if (c === undefined) return false;
        const want = String.fromCodePoint(e.value);
        return (c === want || (ignoreCase && c.toLowerCase() === want.toLowerCase())) && k(pos + 1);
      }
      case 'CharacterSet': {
        step();
        const c = input[pos];
        return c !== undefined && charSetMatches(e, c) && k(pos + 1);
      }
      case 'CharacterClass': {
        step();
        const c = input[pos];
        return c !== undefined && classMatches(e as AST.CharacterClass, c, ignoreCase) && k(pos + 1);
      }
      case 'Group':
        return alternatives(e.alternatives, pos, k);
      case 'CapturingGroup': {
        const index = groupIndex.get(e)!;
        return alternatives(e.alternatives, pos, (p) => {
          const old = captures.get(index);
          captures.set(index, [pos, p]);
          if (k(p)) return true;
          if (old) captures.set(index, old);
          else captures.delete(index);
          return false;
        });
      }
      case 'Assertion':
        step();
        switch (e.kind) {
          case 'start':
            return (pos === 0 || (literal.flags.multiline && input[pos - 1] === '\n')) && k(pos);
          case 'end':
            return (pos === input.length || (literal.flags.multiline && input[pos] === '\n')) && k(pos);
          case 'word':
            return (isWord(pos - 1) !== isWord(pos)) !== e.negate && k(pos);
          case 'lookahead': {
            const saved = new Map(captures);
            const found = alternatives(e.alternatives, pos, () => true);
            if (found === e.negate) {
              captures.clear();
              for (const [a, b] of saved) captures.set(a, b);
              return false;
            }
            return k(pos);
          }
          default:
            throw new Unsupported('lookbehind is not supported here');
        }
      case 'Backreference': {
        step();
        if (Array.isArray(e.resolved)) throw new Unsupported('ambiguous backreferences are not supported here');
        const index = groupIndex.get(e.resolved as AST.CapturingGroup);
        const span = index === undefined ? undefined : captures.get(index);
        const text = span ? input.slice(span[0], span[1]) : '';
        return input.startsWith(text, pos) && k(pos + text.length);
      }
      case 'Quantifier': {
        const { min, max, greedy } = e;
        const repeat = (count: number, p: number): boolean => {
          step();
          if (count < min) return element(e.element, p, (q) => repeat(count + 1, q));
          // A repetition that matched nothing does not repeat again (as in JavaScript).
          const more = () => count < max && element(e.element, p, (q) => q !== p && repeat(count + 1, q));
          return greedy ? more() || k(p) : k(p) || more();
        };
        return repeat(0, pos);
      }
      default:
        throw new Unsupported(`${(e as AST.Node).type} is not supported here`);
    }
  }

  for (let start = 0; start <= input.length; start++) {
    captures.clear();
    if (alternatives(literal.pattern.alternatives, start, () => true)) return { matched: true, steps };
    if (literal.pattern.alternatives.every((a) => a.elements[0]?.type === 'Assertion' && a.elements[0].kind === 'start') && !literal.flags.multiline) break;
  }
  return { matched: false, steps };
}

/** The child nodes of a regexpp node. */
export function children(node: AST.Node): AST.Node[] {
  switch (node.type) {
    case 'RegExpLiteral':
      return [node.pattern];
    case 'Pattern':
    case 'Group':
    case 'CapturingGroup':
      return node.alternatives;
    case 'Alternative':
      return node.elements;
    case 'Assertion':
      return node.kind === 'lookahead' || node.kind === 'lookbehind' ? node.alternatives : [];
    case 'Quantifier':
      return [node.element];
    case 'CharacterClass':
      return node.elements;
    case 'CharacterClassRange':
      return [node.min, node.max];
    default:
      return [];
  }
}

export function parseRegex(source: string, flags = ''): AST.RegExpLiteral {
  return new RegExpParser({ ecmaVersion: 2022 }).parseLiteral(`/${source}/${flags}`);
}

/** Steps for inputs `prefix + pump × k + suffix`, k = 1…maxK, stopping at the first input that reaches `limit`. */
export function growth(literal: AST.RegExpLiteral, prefix: string, pump: string, suffix: string, maxK: number, limit = 1_000_000): { k: number; steps: number | null; matched?: boolean }[] {
  const out: { k: number; steps: number | null; matched?: boolean }[] = [];
  for (let k = 1; k <= maxK; k++) {
    try {
      const r = backtrack(literal, prefix + pump.repeat(k) + suffix, limit);
      out.push({ k, steps: r.steps, matched: r.matched });
    } catch (e) {
      if (!(e instanceof StepLimit)) throw e;
      out.push({ k, steps: null });
      break;
    }
  }
  return out;
}
