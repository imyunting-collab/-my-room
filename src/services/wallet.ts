import { db, type Tx } from '../db/idb';
import type { WalletTransaction } from '../db/types';
import { uuid } from '../lib/util';

export class GameError extends Error {}

export async function txBalance(t: Tx): Promise<number> {
  const rows = await t.store('wallet').all();
  return rows.reduce((s, r) => s + r.amount, 0);
}

/** Grants a reward once per rewardKey. Returns true if paid now. */
export async function txGrant(t: Tx, rewardKey: string, amount: number, reason: string, ref?: { type: string; id: string }): Promise<boolean> {
  const exists = await t.store('wallet').byIndex('rewardKey', rewardKey);
  if (exists.length) return false;
  const row: WalletTransaction = { id: uuid(), amount, reason, rewardKey, refType: ref?.type, refId: ref?.id, createdAt: Date.now() };
  await t.store('wallet').add(row);
  return true;
}

/** Deducts coins inside the caller's transaction. Throws if the balance is insufficient. */
export async function txSpend(t: Tx, amount: number, reason: string, ref?: { type: string; id: string }) {
  if (amount <= 0) return;
  const bal = await txBalance(t);
  if (bal < amount) throw new GameError(`知識幣不足（還差 ${amount - bal} 幣）`);
  await t.store('wallet').add({ id: uuid(), amount: -amount, reason, refType: ref?.type, refId: ref?.id, createdAt: Date.now() });
}

export function balance() { return db.tx(['wallet'], 'readonly', txBalance); }
export async function transactions() { return (await db.all('wallet')).sort((a, b) => b.createdAt - a.createdAt); }
