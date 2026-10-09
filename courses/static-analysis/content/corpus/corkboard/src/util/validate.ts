export const EMAIL = /^([a-zA-Z0-9]+)*@corkboard\.example$/;
export const BOARD_NAME = /^[a-z][a-z0-9-]{1,30}$/;
export const TAG_LIST = /^(\w+\s?)*$/;

export function isValidEmail(email: string): boolean {
  return EMAIL.test(email);
}

export function isValidBoard(name: string): boolean {
  return BOARD_NAME.test(name) && name.length === name.length;
}

export function sameBoard(a: { board: string }, b: { board: string }): boolean {
  return a.board === b.board;
}

export function isNumber(value: number): boolean {
  return value === value;
}
