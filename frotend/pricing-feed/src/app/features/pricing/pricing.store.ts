import { inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { pipe, switchMap, tap, interval } from 'rxjs';
import { takeWhile } from 'rxjs/operators';
import { PricingRecord, SearchParams, UploadStatus } from '../../core/models/pricing.model';
import { PricingService } from '../../core/services/pricing.service';

interface PricingState {
  records: PricingRecord[];
  loading: boolean;
  saving: boolean;
  hasMore: boolean;
  lastSearch: SearchParams;
  editingId: string | null;
  uploadStatus: UploadStatus | null;
  error: string | null;
}

const initialState: PricingState = {
  records:      [],
  loading:      false,
  saving:       false,
  hasMore:      false,
  lastSearch:   { limit: 50 },
  editingId:    null,
  uploadStatus: null,
  error:        null,
};

export const PricingStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store, svc = inject(PricingService)) => ({

    // Search / filter records
    search: rxMethod<SearchParams>(pipe(
      tap(p => patchState(store, { loading: true, lastSearch: p, error: null })),
      switchMap(p => svc.search(p).pipe(
        tapResponse({
          next: r => patchState(store, {
            records: r.items,
            hasMore: r.has_more,
            loading: false,
          }),
          error: (e: Error) => patchState(store, {
            loading: false,
            error: e.message,
          }),
        })
      ))
    )),

    // Set which row is being edited (null = no row)
    setEditing(id: string | null) {
      patchState(store, { editingId: id, error: null });
    },

    // Save edited row
    saveRecord: rxMethod<{ id: string; changes: Partial<PricingRecord> & { version: number } }>(pipe(
      tap(() => patchState(store, { saving: true, error: null })),
      switchMap(({ id, changes }) => svc.updateRecord(id, changes).pipe(
        tapResponse({
          next: updated => patchState(store, {
            saving:    false,
            editingId: null,
            // Replace the updated record in the list
            records: store.records().map(r => r.id === updated.id ? updated : r),
          }),
          error: (e: Error) => patchState(store, {
            saving: false,
            error:  e.message,
          }),
        })
      ))
    )),

    // Upload CSV and poll for status
    uploadCsv: rxMethod<{ file: File; storeId: string }>(pipe(
      tap(() => patchState(store, { error: null })),
      switchMap(({ file, storeId }) => svc.uploadCsv(file, storeId).pipe(
        tapResponse({
          next: res => {
            patchState(store, {
              uploadStatus: { id: res.upload_id, status: 'QUEUED' } as UploadStatus,
            });
            // Poll every 2 seconds until DONE or FAILED
            interval(2000).pipe(
              switchMap(() => svc.pollStatus(res.upload_id)),
              takeWhile(s => s.status === 'QUEUED' || s.status === 'PROCESSING', true),
            ).subscribe({
              next:  s => patchState(store, { uploadStatus: s }),
              error: (e: Error) => patchState(store, { error: e.message }),
            });
          },
          error: (e: Error) => patchState(store, { error: e.message }),
        })
      ))
    )),

    clearError() {
      patchState(store, { error: null });
    },

  }))
);
