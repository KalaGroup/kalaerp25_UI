export interface IcncCheckerprcDts {
  PFBCode: string;
  Dt: string;
  CanopyPlanCode: string;
  CanopyPart: string;
  NestingPart: string;
  ProcessPart: string;
  ProfitCenter: string;

  // Fields the Auth/Reject payload pulls off the selected row:
  Sheetpartcode: string;
  CatID: string;
  ProductCode: string;
  NestingForQty: number;

  // Optional state attached to a row after a save round-trip:
  ProductionType?: string;
  ProductionDetails?: string;
  Remarks?: string;
}
