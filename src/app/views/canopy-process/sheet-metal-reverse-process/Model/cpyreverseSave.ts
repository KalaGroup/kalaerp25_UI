// One selected reverse row (C# CpyRevDetail).
export interface CpyRevDetail {
  CPCode: string;
  ProductCode: string;
  CatId: string;      // note: CatId (lowercase d) to match the C# DTO
}

// One 6M production line (C# ProductionDetail).
export interface ProductionDetail {
  Id: number;
  SixM: string;
  Description: string;
  AssignTo: string;
  EmpPCCode: string;
}

// Payload POSTed to SubmitRevCpyTrans (C# CpyRevRequest).
export interface ICpyReverseSave {
  PCCode: string;
  PCCode_Act: string;
  TransType: string;                    // 'IndividualCode' | 'AllCode'
  EmpCode: string;
  Details: CpyRevDetail[];
  ProductionDetails: ProductionDetail[];
}
