export interface IJobcard_CpDts {
  SelectR: boolean;
  KVA: string;                 // ← string, NOT number
  Model: string;
  Phase: string;
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
}
