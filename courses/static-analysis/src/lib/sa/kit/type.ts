/**
 * Questions about types, answered by TypeScript's checker. Counterpart of SonarJS's `rules/helpers/type.ts`.
 *
 * Every function takes the parser services (see `parser-services.ts`); call them only after
 * `isRequiredParserServices(services)` returned true.
 */
import ts from 'typescript';
import type estree from 'estree';
import type { RequiredParserServices } from './parser-services.js';

/** The type TypeScript computed for an ESTree node, at that point of the program (after narrowing). */
export function getTypeFromTreeNode(node: estree.Node, services: RequiredParserServices): ts.Type {
  const checker = services.program.getTypeChecker();
  return checker.getTypeAtLocation(services.esTreeNodeToTSNodeMap.get(node));
}

export function typeToString(node: estree.Node, services: RequiredParserServices): string {
  return services.program.getTypeChecker().typeToString(getTypeFromTreeNode(node, services));
}

export function getSymbolAtLocation(node: estree.Node, services: RequiredParserServices): ts.Symbol | undefined {
  return services.program.getTypeChecker().getSymbolAtLocation(services.esTreeNodeToTSNodeMap.get(node));
}

/** The members of a union type, or the type itself. */
export function getUnionTypes(type: ts.Type): ts.Type[] {
  return type.isUnion() ? type.types : [type];
}

export function isUnion(type: ts.Type): type is ts.UnionType {
  return type.isUnion();
}

export function isAny(type: ts.Type): boolean {
  return (type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) !== 0;
}

/** Is `type` string-like: `string`, a string literal type, a template literal type, or the `String` wrapper? */
export function isStringType(type: ts.Type): boolean {
  return (type.flags & ts.TypeFlags.StringLike) !== 0 || type.symbol?.name === 'String';
}

export function isBigIntType(type: ts.Type): boolean {
  return (type.flags & ts.TypeFlags.BigIntLike) !== 0;
}

export function isNumberType(type: ts.Type): boolean {
  return (type.flags & ts.TypeFlags.NumberLike) !== 0;
}

/** Is the node's type string-like (including string literal types)? */
export function isString(node: estree.Node, services: RequiredParserServices): boolean {
  return isStringType(getTypeFromTreeNode(node, services));
}

/** Is the node's type an array or a tuple? */
export function isArray(node: estree.Node, services: RequiredParserServices): boolean {
  const checker = services.program.getTypeChecker();
  const type = getTypeFromTreeNode(node, services);
  return checker.isArrayType(type) || checker.isTupleType(type);
}

/** Is `type` exactly `null` or `undefined` (or a union of only those)? */
export function isNullOrUndefinedType(type: ts.Type): boolean {
  return getUnionTypes(type).every((t) => (t.flags & (ts.TypeFlags.Null | ts.TypeFlags.Undefined | ts.TypeFlags.Void)) !== 0);
}

/** Can a value of `type` be `null` or `undefined`? */
export function isNullableType(type: ts.Type): boolean {
  return getUnionTypes(type).some((t) => (t.flags & (ts.TypeFlags.Null | ts.TypeFlags.Undefined | ts.TypeFlags.Void)) !== 0);
}

/** Does the type have a callable `then` member (a promise or another thenable)? */
export function isThenable(node: estree.Node, services: RequiredParserServices): boolean {
  const type = getTypeFromTreeNode(node, services);
  const then = type.getProperty('then');
  if (!then) return false;
  const checker = services.program.getTypeChecker();
  const thenType = checker.getTypeOfSymbolAtLocation(then, services.esTreeNodeToTSNodeMap.get(node));
  return thenType.getCallSignatures().length > 0;
}

/** Is the node's type exactly `null` or `undefined` at that point? (Not a union that includes them.) */
export function isUndefinedOrNull(node: estree.Node, services: RequiredParserServices): boolean {
  const flags = getTypeFromTreeNode(node, services).getFlags();
  return (flags & ts.TypeFlags.Undefined) !== 0 || (flags & ts.TypeFlags.Null) !== 0;
}

/** Is `type` an array type, `T[]` or `Array<T>` (not a tuple)? */
export function isArrayType(type: ts.Type, services: RequiredParserServices): type is ts.TypeReference {
  return services.program.getTypeChecker().isArrayType(type);
}

/**
 * Is `type` an array, a union of arrays, or a type parameter constrained to one? `T extends number[]` is
 * array-like; so is `string[] | number[]`.
 */
export function isArrayLikeType(type: ts.Type, services: RequiredParserServices): boolean {
  const constrained = services.program.getTypeChecker().getBaseConstraintOfType(type) ?? type;
  return getUnionTypes(constrained).every((t) => isArrayType(t, services));
}

function isArrayOf(type: ts.Type, services: RequiredParserServices, element: (t: ts.Type) => boolean): boolean {
  if (!isArrayType(type, services)) return false;
  const [elementType] = services.program.getTypeChecker().getTypeArguments(type);
  return !!elementType && element(elementType);
}

export function isStringArray(type: ts.Type, services: RequiredParserServices): boolean {
  return isArrayOf(type, services, isStringType);
}

export function isNumberArray(type: ts.Type, services: RequiredParserServices): boolean {
  return isArrayOf(type, services, isNumberType);
}

export function isBigIntArray(type: ts.Type, services: RequiredParserServices): boolean {
  return isArrayOf(type, services, isBigIntType);
}
