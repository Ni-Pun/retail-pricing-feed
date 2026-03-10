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
  styleUrl: './pricing.page.scss',
  templateUrl: './pricing.page.html',
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
