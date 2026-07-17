// // Interface for individual detail item
// export interface IProductionDetail {
//   id: number;
//   sixM: string;
//   description: string;
//   assignTo: string;
// }

// // Interface for the main payload
// export interface ISheetMetalJobcardCheckerSave {
//   Code: string;
//   CompCode: string;
//   EmpCode: string;
//   PCCode: string;
//   batchQty: number;
//   details: IProductionDetail[];
//   kva: number;
//   model: string;
//   planCode: string;
//   Partcode: string;
//   bomCode: string;
//   productionDetails: string;
//   productionType: string;
//   status: string;
// }

// Interface for individual detail item
export interface IProductionDetail {
  id: number;
  sixM: string;
  description: string;
  assignTo: string;
  empPCCode: string;   // ← add this
  
}

// Interface for the main payload
export interface IRejectPayload {
  Code: string;
  CompCode: string;
  EmpCode: string;
  PCCode: string;
  batchQty: number;
  details: IProductionDetail[];
  kva: number;
  model: string;
  planCode: string;
  Partcode: string;
  bomCode: string;
  productionDetails: string;
  productionType: string;
  status: string;
}