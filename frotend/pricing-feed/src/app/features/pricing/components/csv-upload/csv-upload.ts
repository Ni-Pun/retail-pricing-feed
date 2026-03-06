import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzUploadFile, NzUploadModule } from 'ng-zorro-antd/upload';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { PricingStore } from '../../pricing.store';
import { UploadStatus } from '../../../../core/models/pricing.model';

@Component({
  selector: 'app-csv-upload',
  standalone: true,
  imports: [
    FormsModule,
    NzUploadModule,
    NzProgressModule,
    NzButtonModule,
    NzInputModule,
    NzCardModule,
    NzAlertModule,
    NzTagModule,
  ],
  template: `
    <nz-card nzTitle="📤 Upload Pricing CSV" style="max-width:600px">

      <div style="margin-bottom:12px">
        <label style="display:block; margin-bottom:4px; font-weight:500">
          Store ID *
        </label>
        <input
          nz-input
          [(ngModel)]="storeId"
          placeholder="e.g. STORE-001"
          style="width:220px"
        />
      </div>

      <nz-upload
        nzAccept=".csv"
        [nzBeforeUpload]="onFile"
        [nzShowUploadList]="false"
        nzType="drag"
        style="display:block"
      >
        <p style="font-size:32px; margin:8px 0">📁</p>
        <p>Click or drag a CSV file here to upload</p>
        <p style="color:#999; font-size:12px">
          Required columns: store_id, sku, product_name, price, date
        </p>
      </nz-upload>

      @let s = store.uploadStatus();
      @if (s) {
        <div style="margin-top:16px">
          <div style="display:flex; justify-content:space-between;
                      align-items:center; margin-bottom:8px">
            <strong>{{ s.filename }}</strong>
            <nz-tag [nzColor]="tagColor(s.status)">{{ s.status }}</nz-tag>
          </div>

          @if (s.total_rows) {
            <nz-progress
              [nzPercent]="pct(s)"
              [nzStatus]="progressStatus(s.status)"
            />
            <p style="font-size:12px; color:#666; margin-top:4px">
              {{ s.processed_rows }} / {{ s.total_rows }} rows
              · {{ s.error_count }} errors
            </p>
          }

          @if (s.status === 'FAILED') {
            <nz-alert
              nzType="error"
              [nzMessage]="errMsg(s)"
              nzShowIcon
            />
          }

          @if (s.status === 'DONE') {
            <nz-alert
              nzType="success"
              nzMessage="Upload complete! Click Search to see the new records."
              nzShowIcon
            />
          }
        </div>
      }

    </nz-card>
  `,
})
export class CsvUploadComponent {
  readonly store = inject(PricingStore);
  storeId = '';

  onFile = (file: NzUploadFile, fileList: NzUploadFile[]): boolean => {
    if (!this.storeId.trim()) {
      alert('Please enter a Store ID before uploading.');
      return false;
    }
    const actualFile = (file.originFileObj ?? file) as File;
    this.store.uploadCsv({ file: actualFile, storeId: this.storeId });
    return false; // Prevent nz-upload from making its own HTTP call
  };

  pct(s: Pick<UploadStatus, 'processed_rows' | 'total_rows'>): number {
    return s.total_rows
      ? Math.round((s.processed_rows / s.total_rows) * 100)
      : 0;
  }

  tagColor(status: string): string {
    if (status === 'DONE')   return 'green';
    if (status === 'FAILED') return 'red';
    return 'orange';
  }

  progressStatus(status: string): 'success' | 'exception' | 'active' {
    if (status === 'DONE')   return 'success';
    if (status === 'FAILED') return 'exception';
    return 'active';
  }

  errMsg(s: Pick<UploadStatus, 'error_detail'>): string {
    return (s.error_detail?.['message'] as string) ?? 'Processing failed';
  }
}
