import { isIpqcDb } from '@/db/ipqc-store'
import type { CheckScores, IpqcDb } from '@/domain/ipqc/types'

export type LedgerSnapshot = {
  fa: IpqcDb['fa']
  fqc: IpqcDb['fqc']
  fqcNg: IpqcDb['fqcNg']
  cmp: IpqcDb['cmp']
  perf: IpqcDb['perf']
  mat: IpqcDb['mat']
  trn: IpqcDb['trn']
  exam: IpqcDb['exam']
  skill: IpqcDb['skill']
}

export function mergeLedgerSnapshot(current: IpqcDb, snapshot: LedgerSnapshot): IpqcDb {
  const next: IpqcDb = {
    fa: snapshot.fa as IpqcDb['fa'],
    fqc: snapshot.fqc,
    fqcNg: snapshot.fqcNg,
    cmp: snapshot.cmp as IpqcDb['cmp'],
    perf: snapshot.perf as IpqcDb['perf'],
    mat: current.mat,
    trn: current.trn,
    exam: current.exam,
    skill: current.skill,
  }
  if (!isIpqcDb(next)) {
    throw new Error('invalid snapshot')
  }
  return next
}

export function mergeCheckScores(
  current: CheckScores,
  patch: CheckScores,
): CheckScores {
  const out: CheckScores = { ...current }
  for (const [ws, months] of Object.entries(patch)) {
    out[ws] = { ...(out[ws] ?? {}), ...months }
  }
  return out
}