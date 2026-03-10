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
  templateUrl: './pricing-table.html',
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
