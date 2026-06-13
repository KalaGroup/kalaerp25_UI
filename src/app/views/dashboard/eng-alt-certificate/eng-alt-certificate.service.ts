import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';

export interface EngAltCertRow {
  TRCode: string | null;
  TRDt: string | null;
  EngSrNo: string | null;
  AltSrNo: string | null;
  KVA: string | null;
  Phase: string | null;
  Model: string | null;
  PanelType: string | null;
  PartDesc: string | null;
  DIStatus: string | null;
  ProcessCode: string | null;
  ProcessDt: string | null;
  PCName: string | null;
  PCCode: string | null;
  Remark: string | null;
  PartCode: string | null;
  Attachment: string | null;
  TRPreview: string | null;
  CntEngFile: string | null;
  CntAltFile: string | null;
  CTFile: string | null;
  KWHFile: string | null;
  [key: string]: any;
}

export interface LineRight {
  LineWisePC: string;
  LineDesc: string;
  ParentDgPC: string;
}

export interface AttachmentApiRow {
  SrNo: number;
  Type: 'Image' | 'Video' | string;
  FileType: string;
  SaveOrUpdate: 'S' | 'N' | string;
  FileName: string;
  Video_ID: string | null;
  [key: string]: any;
}

@Injectable({
  providedIn: 'root',
})
export class EngAltCertificateService {
  private baseUrl = environment.apiURL;
  private apiUrl = `${this.baseUrl}DGAssemblly/GetEngAltTrCertificate`;
  private attachmentsUrl = `${this.baseUrl}DGAssemblly/GetEngAltTrAttachments`;
  private downloadUrl = `${this.baseUrl}DGAssemblly/DownloadEngAltTrAttachment`;
  private saveAttachmentsUrl = `${this.baseUrl}DGAssemblly/SaveEngAltTrAttachments`;
  private deleteAttachmentUrl = `${this.baseUrl}DGAssemblly/DeleteEngAltTrAttachment`;
  private lineRightsUrl = `${this.baseUrl}DGAssemblly/GetLineRights`;

  constructor(private http: HttpClient) {}

  getEngAltTrCertificate(
    fromDate: string,
    toDate: string,
    serialNo: string
  ): Observable<EngAltCertRow[]> {
    let params = new HttpParams()
      .set('fromDate', fromDate)
      .set('toDate', toDate);
    if (serialNo && serialNo.trim()) {
      params = params.set('serialNo', serialNo.trim());
    }
    return this.http.get<EngAltCertRow[]>(this.apiUrl, { params });
  }

  getAttachmentsForTr(trCode: string): Observable<AttachmentApiRow[]> {
    const params = new HttpParams().set('trCode', trCode);
    return this.http.get<AttachmentApiRow[]>(this.attachmentsUrl, { params });
  }

  /** Builds the download URL (opens in a new tab so the browser handles auth/cookies). */
  buildDownloadUrl(trCode: string, fileName: string, fileType: string, videoId?: string | null): string {
    const params = new URLSearchParams({
      trCode: trCode ?? '',
      fileName: fileName ?? '',
      fileType: fileType ?? '',
    });
    if (videoId) params.set('videoId', videoId);
    return `${this.downloadUrl}?${params.toString()}`;
  }

  saveAttachments(
    trCode: string,
    empCode: string,
    compCode: string,
    items: { fileType: string; file: File }[]
  ): Observable<{ message: string }> {
    const form = new FormData();
    form.append('TRCode', trCode);
    form.append('EmpCode', empCode);
    form.append('CompCode', compCode);
    for (const item of items) {
      form.append('Files', item.file, item.file.name);
      form.append('FileTypes', item.fileType);
    }
    return this.http.post<{ message: string }>(this.saveAttachmentsUrl, form);
  }

  getLineRights(prmCode: string): Observable<LineRight[]> {
    const params = new HttpParams().set('prmCode', prmCode);
    return this.http.get<LineRight[]>(this.lineRightsUrl, { params });
  }

  deleteAttachment(
    trCode: string,
    fileName: string,
    fileType: string,
    videoId: string | null,
    empCode: string,
    compCode: string
  ): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(this.deleteAttachmentUrl, {
      TRCode: trCode,
      FileName: fileName,
      FileType: fileType,
      VideoId: videoId,
      EmpCode: empCode,
      CompCode: compCode,
    });
  }
}
