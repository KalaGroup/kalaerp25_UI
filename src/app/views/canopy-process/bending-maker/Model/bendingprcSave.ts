export interface IbendingprcSave {
    EmpCode: string;
    PCCode_Act: string;
    PCCode: string;
    PlanCode: string;
    ProductCode: string;
    PFBCode: string;
    CpyKitcode: string;

    // Numeric fields on the C# DTO are typed as `string`, so we
    // serialise them as strings to keep ASP.NET model binding happy.
    BatchQty: string;
    PrcQty:   string;
    PFBRate:  string;
    Rate:     string;
    PWt:      string;
    PSqft:    string;

    MachineCodeSrNo: string;
    BOMcode: string;
    PrcDts: string;            // Partcode-->KitQty-->TotQty-->... (comma-joined)
    Remark: string;
    AttachFileDts: string;
    CatID: string;
}