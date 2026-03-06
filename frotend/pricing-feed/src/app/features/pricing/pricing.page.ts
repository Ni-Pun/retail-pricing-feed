import { Component, inject, OnInit } from '@angular/core';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { SearchBarComponent } from './components/search-bar/search-bar';
import { PricingTableComponent } from './components/pricing-table/pricing-table';
import { CsvUploadComponent } from './components/csv-upload/csv-upload';
import { PricingStore } from './pricing.store';
import { SearchParams } from '../../core/models/pricing.model';

@Component({
  selector: 'app-pricing-page',
  standalone: true,
  imports: [
    NzLayoutModule,
    NzDividerModule,
    NzAlertModule,
    SearchBarComponent,
    PricingTableComponent,
    CsvUploadComponent,
  ],
  styles: [`
    .header {
      background: linear-gradient(135deg, #4f46e5, #7c3aed);
      display: flex;
      align-items: center;
      padding: 0 24px;
    }
    .title {
      color: white;
      margin: 0;
      font-size: 20px;
    }
    .content {
      padding: 24px;
    }
  `],
  template: `
    <nz-layout style="min-height:100vh">
      <nz-header class="header">
        <h2 class="title">🏪 Retail Pricing Feed System</h2>
      </nz-header>

      <nz-content class="content">
        @if (store.error()) {
          <nz-alert
            nzType="error"
            [nzMessage]="store.error()!"
            nzCloseable
            (nzOnClose)="store.clearError()"
            nzShowIcon
            style="margin-bottom:16px"
          />
        }

        <app-csv-upload />
        <nz-divider />
        <app-search-bar (searched)="onSearch($event)" />
        <nz-divider />
        <app-pricing-table />
      </nz-content>
    </nz-layout>
  `,
})
export class PricingPageComponent implements OnInit {
  readonly store = inject(PricingStore);

  ngOnInit(): void {
    this.store.search({ limit: 50 });  // Load first 50 records on page load
  }

  onSearch(params: SearchParams): void {
    this.store.search(params);
  }
}
