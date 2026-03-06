import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe, DatePipe } from '@angular/common';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { PricingStore } from '../../pricing.store';
import { PricingRecord } from '../../../../core/models/pricing.model';

@Component({
  selector: 'app-pricing-table',
  standalone: true,
  imports: [
    FormsModule,
    DecimalPipe,
    DatePipe,
    NzTableModule,
    NzButtonModule,
    NzInputModule,
    NzInputNumberModule,
    NzTagModule,
    NzSpinModule,
  ],
  template: `
    <nz-table
      [nzData]="store.records()"
      [nzLoading]="store.loading()"
      [nzScroll]="{ x: '1200px' }"
      nzSize="small"
    >
      <thead>
        <tr>
          <th nzWidth="120px">Store ID</th>
          <th nzWidth="120px">SKU</th>
          <th nzWidth="220px">Product Name</th>
          <th nzWidth="110px">Price</th>
          <th nzWidth="100px">Currency</th>
          <th nzWidth="130px">Date</th>
          <th nzWidth="80px">Ver.</th>
          <th nzWidth="160px">Updated By</th>
          <th nzWidth="160px" nzRight>Actions</th>
        </tr>
      </thead>
      <tbody>
        @for (row of store.records(); track row.id) {
          <tr>
            <td>{{ row.store_id }}</td>
            <td>{{ row.sku }}</td>

            @if (store.editingId() === row.id) {
              <td>
                <input nz-input [(ngModel)]="buf.product_name" style="width:180px" />
              </td>
              <td>
                <nz-input-number
                  [(ngModel)]="buf.price"
                  [nzMin]="0.01"
                  [nzPrecision]="4"
                  [nzStep]="0.01"
                  style="width:100px"
                />
              </td>
              <td>
                <input nz-input [(ngModel)]="buf.currency"
                  maxlength="3" style="width:60px" />
              </td>
            } @else {
              <td>{{ row.product_name }}</td>
              <td>{{ row.price | number:'1.2-4' }}</td>
              <td><nz-tag>{{ row.currency }}</nz-tag></td>
            }

            <td>{{ row.price_date | date:'mediumDate' }}</td>
            <td><nz-tag nzColor="blue">v{{ row.version }}</nz-tag></td>
            <td>{{ row.updated_by }}</td>
            <td nzRight>
              @if (store.editingId() === row.id) {
                <button
                  nz-button nzType="primary" nzSize="small"
                  [nzLoading]="store.saving()"
                  (click)="save(row)">
                  Save
                </button>
                <button
                  nz-button nzSize="small"
                  (click)="cancel()"
                  style="margin-left:4px">
                  Cancel
                </button>
              } @else {
                <button nz-button nzSize="small" (click)="edit(row)">
                  Edit
                </button>
              }
            </td>
          </tr>
        }

        @if (!store.loading() && store.records().length === 0) {
          <tr>
            <td colspan="9" style="text-align:center; padding:32px; color:#999">
              No records found. Upload a CSV or adjust your search filters.
            </td>
          </tr>
        }
      </tbody>
    </nz-table>

    @if (store.hasMore()) {
      <div style="text-align:center; padding:12px">
        <button nz-button (click)="loadMore()">Load More</button>
      </div>
    }
  `,
})
export class PricingTableComponent {
  readonly store = inject(PricingStore);
  buf: Partial<PricingRecord> = {};

  edit(row: PricingRecord): void {
    this.buf = {
      product_name: row.product_name,
      price:        row.price,
      currency:     row.currency,
    };
    this.store.setEditing(row.id);
  }

  save(row: PricingRecord): void {
    this.store.saveRecord({
      id:      row.id,
      changes: { ...this.buf, version: row.version },
    });
  }

  cancel(): void {
    this.store.setEditing(null);
  }

  loadMore(): void {
    const current = this.store.lastSearch();
    this.store.search({ ...current, limit: (current.limit ?? 50) + 50 });
  }
}
