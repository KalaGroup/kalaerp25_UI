// One 6M line inside the save payload.
export interface BendingCheckerSaveDetail {
  id: number;
  sixM: string;
  description: string;
  assignTo: string;
  assignToPccode: string;
}

// Payload POSTed to BendingCheckerSubmit (used for both AUTH and REJECT).
export interface IbendingcheckerprcSave {
  Code: string;
  EmpCode: string;
  PCCode_Act: string;
  PCCode: string;
  CompCode: string;
  pfbCode: string;
  PlanCode: string;
  Sheetpartcode: string;
  CatID: string;
  ProductCode: string;
  /** C# DTO has `string BatchQty`. */
  BatchQty: string;
  productionType: string;
  productionDetails: string;
  status: 'AUTH' | 'REJECT' | string;
  details: BendingCheckerSaveDetail[];
}