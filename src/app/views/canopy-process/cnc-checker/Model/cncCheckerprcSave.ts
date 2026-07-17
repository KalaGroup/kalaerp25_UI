export interface IcnccheckerprcSave {

  Code: string;
  CompCode: string;
  EmpCode: string;
  PCCode_Act: string;
  PCCode: string;
  pfbCode: string;
  PlanCode: string;
  Sheetpartcode: string;
  CatID: string;
  ProductCode: string;
  /** API expects this as a string (System.String on the C# DTO). */
  BatchQty: string;
  status: string;
  details: IProductionDetail[];
  productionDetails: string;
  productionType: string;


}

export interface IProductionDetail {
  id: number;
  sixM: string;
  description: string;
  assignTo: string;
  assignToPccode?: string;
}

