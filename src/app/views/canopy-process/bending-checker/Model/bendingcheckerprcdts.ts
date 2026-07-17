// Row returned by GetCPYPlanchecker and shown in the "DG PartCode Details" grid.
// Some fields are populated by the API; ProductionType / ProductionDetails are
// filled in on the client before the AUTH / REJECT payload is built.
export interface Ibendingcheckerprcdts {
  PFBCode: string;
  Dt: string;
  CanopyPlanCode: string;
  ProcessPart: string;
  Sheetpartcode: string;
  CatID: string | number;
  ProductCode: string;
  NestingForQty: number;

  // Set on the client when authorising / rejecting:
  ProductionType?: string;
  ProductionDetails?: string;
  Remarks?: string;
}