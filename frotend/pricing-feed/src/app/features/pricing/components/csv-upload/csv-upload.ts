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
  templateUrl: './csv-upload.html',
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
