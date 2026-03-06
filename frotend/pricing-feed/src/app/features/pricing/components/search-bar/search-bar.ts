import { Component, output, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { SearchParams } from '../../../../core/models/pricing.model';

@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    NzFormModule,
    NzInputModule,
    NzButtonModule,
    NzInputNumberModule,
  ],
  template: `
    <form nz-form [formGroup]="form" (ngSubmit)="onSearch()" nzLayout="inline">
      <nz-form-item>
        <nz-form-label>Store ID</nz-form-label>
        <nz-form-control>
          <input nz-input formControlName="store_id"
            placeholder="e.g. STORE-001" style="width:140px" />
        </nz-form-control>
      </nz-form-item>

      <nz-form-item>
        <nz-form-label>SKU</nz-form-label>
        <nz-form-control>
          <input nz-input formControlName="sku"
            placeholder="e.g. SKU-A001" style="width:140px" />
        </nz-form-control>
      </nz-form-item>

      <nz-form-item>
        <nz-form-label>Product</nz-form-label>
        <nz-form-control>
          <input nz-input formControlName="product_name"
            placeholder="Product name" style="width:180px" />
        </nz-form-control>
      </nz-form-item>

      <nz-form-item>
        <nz-form-label>Min Price</nz-form-label>
        <nz-form-control>
          <nz-input-number formControlName="price_min"
            [nzMin]="0" [nzStep]="0.5" style="width:100px" />
        </nz-form-control>
      </nz-form-item>

      <nz-form-item>
        <nz-form-label>Max Price</nz-form-label>
        <nz-form-control>
          <nz-input-number formControlName="price_max"
            [nzMin]="0" [nzStep]="0.5" style="width:100px" />
        </nz-form-control>
      </nz-form-item>

      <nz-form-item>
        <nz-form-label>Date From</nz-form-label>
        <nz-form-control>
          <input nz-input type="date" formControlName="date_from" style="width:150px" />
        </nz-form-control>
      </nz-form-item>

      <nz-form-item>
        <nz-form-label>Date To</nz-form-label>
        <nz-form-control>
          <input nz-input type="date" formControlName="date_to" style="width:150px" />
        </nz-form-control>
      </nz-form-item>

      <nz-form-item>
        <nz-form-control>
          <button nz-button nzType="primary" type="submit">Search</button>
          <button nz-button type="button"
            (click)="onReset()" style="margin-left:8px">Reset</button>
        </nz-form-control>
      </nz-form-item>
    </form>
  `,
})
export class SearchBarComponent {
  readonly searched = output<SearchParams>();
  readonly #fb = inject(FormBuilder);

  form = this.#fb.group({
    store_id:     [''],
    sku:          [''],
    product_name: [''],
    price_min:    [null as number | null],
    price_max:    [null as number | null],
    date_from:    [''],
    date_to:      [''],
  });

  onSearch(): void {
    const v = this.form.value;
    const p: SearchParams = { limit: 50 };
    if (v.store_id)     p.store_id     = v.store_id!;
    if (v.sku)          p.sku          = v.sku!;
    if (v.product_name) p.product_name = v.product_name!;
    if (v.price_min)    p.price_min    = v.price_min!;
    if (v.price_max)    p.price_max    = v.price_max!;
    if (v.date_from)    p.date_from    = v.date_from!;
    if (v.date_to)      p.date_to      = v.date_to!;
    this.searched.emit(p);
  }

  onReset(): void {
    this.form.reset();
    this.searched.emit({ limit: 50 });
  }
}

