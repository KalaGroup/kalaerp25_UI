// Payload POSTed to PowderCoatingSubmit.
export interface IpowdercoatingprcSave {
  EmpCode: string;
  PCCode_Act: string;
  PCCode: string;
  SupplierCode: string;
  MachineCodeSrNo: string;
  StdSqft: number;
  PrcDts: string;            // PlanCode-->ProductCode-->BOMCode-->... (comma-joined)
  Remark: string;
  AttachFileDts: string;
  catID: string;
}
