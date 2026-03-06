import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PricingRecord, SearchParams, UploadStatus } from '../models/pricing.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PricingService {
  readonly #http = inject(HttpClient);
  readonly #base = `${environment.apiUrl}/api/v1`;

  search(params: SearchParams): Observable<{ items: PricingRecord[]; has_more: boolean }> {
    let qp = new HttpParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v) !== '') {
        qp = qp.set(k, String(v));
      }
    });
    return this.#http.get<{ items: PricingRecord[]; has_more: boolean }>(
      `${this.#base}/pricing`, { params: qp }
    );
  }

  getRecord(id: string): Observable<PricingRecord> {
    return this.#http.get<PricingRecord>(`${this.#base}/pricing/${id}`);
  }

  updateRecord(
    id: string,
    payload: Partial<PricingRecord> & { version: number }
  ): Observable<PricingRecord> {
    return this.#http.put<PricingRecord>(`${this.#base}/pricing/${id}`, payload);
  }

  uploadCsv(
    file: File,
    storeId: string
  ): Observable<{ upload_id: string; status: string }> {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('store_id', storeId);
    return this.#http.post<{ upload_id: string; status: string }>(
      `${this.#base}/uploads`, fd
    );
  }

  pollStatus(uploadId: string): Observable<UploadStatus> {
    return this.#http.get<UploadStatus>(
      `${this.#base}/uploads/${uploadId}/status`
    );
  }
}
