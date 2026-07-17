export interface IJobcard_CpyDts {
  SelectR: boolean;
  KVA: string;                 // ← string, NOT number
  Model: string;
  Partcode: string;
  FNorm: number;
  TotStk: number;
  WIPStk: number;
  PenPlanQty: number;
  PReq: number;
  PlanQty: number;
  BatchQty: number;
  Bomcode: string;
  PlanCode: string;
  PlanDate: Date | string;
  DayPlanQty: number;
  DayNumber?: number;
  DayName?: string;
  TodayFlag?: string;
  CurrentMonthPlanQty?: number;
  Month?: number;
  Yr?: number;
  shiftType?: number;          // ← OPTIONAL with `?`
}