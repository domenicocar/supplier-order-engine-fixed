import { computed, Injectable, signal } from '@angular/core';

import {
  OrderExportResult,
  OrderImportResult,
  SessionOrder,
  SupplierUploadResult
} from '../models/order.models';

@Injectable({
  providedIn: 'root'
})
export class OrdersSessionStore {
  private readonly ordersState = signal<SessionOrder[]>([]);

  readonly orders = computed(() => this.ordersState());

  orderById(id: string): SessionOrder | undefined {
    return this.ordersState().find((order) => order.id === id);
  }

  setOrders(orders: SessionOrder[]): void {
    this.ordersState.set(orders);
  }

  upsertOrder(order: SessionOrder): void {
    this.ordersState.update((orders) => {
      const index = orders.findIndex((current) => current.id === order.id);

      if (index === -1) {
        return [order, ...orders];
      }

      const next = [...orders];
      next[index] = {
        ...orders[index],
        ...order,
        suppliers: order.suppliers ?? orders[index].suppliers,
        supplierComparisonRows:
          order.supplierComparisonRows ?? orders[index].supplierComparisonRows,
        importResult: order.importResult ?? orders[index].importResult,
        exportResult: order.exportResult ?? orders[index].exportResult,
        supplierUploads: {
          ...orders[index].supplierUploads,
          ...order.supplierUploads
        }
      };

      return next;
    });
  }

  setImportResult(orderId: string, payload: { status?: string; items: SessionOrder['items']; reviewItems: SessionOrder['reviewItems']; importResult: OrderImportResult }): void {
    this.ordersState.update((orders) =>
      orders.map((order) =>
        order.id === orderId
          ? {
              ...order,
              status: payload.status ?? order.status,
              items: payload.items,
              reviewItems: payload.reviewItems,
              importResult: payload.importResult
            }
          : order
      )
    );
  }

  setExportResult(orderId: string, payload: { status?: string; reviewItems: SessionOrder['reviewItems']; exportResult: OrderExportResult }): void {
    this.ordersState.update((orders) =>
      orders.map((order) =>
        order.id === orderId
          ? {
              ...order,
              status: payload.status ?? order.status,
              reviewItems: payload.reviewItems,
              exportResult: payload.exportResult
            }
          : order
      )
    );
  }

  setSupplierComparisonRows(orderId: string, rows: NonNullable<SessionOrder['supplierComparisonRows']>): void {
    this.ordersState.update((orders) =>
      orders.map((order) =>
        order.id === orderId
          ? {
              ...order,
              supplierComparisonRows: rows
            }
          : order
      )
    );
  }

  appendSupplierUpload(orderId: string, upload: SupplierUploadResult): void {
    this.ordersState.update((orders) =>
      orders.map((order) => {
        if (order.id !== orderId) {
          return order;
        }

        const currentUploads = order.supplierUploads[upload.supplierId] ?? [];

        return {
          ...order,
          supplierUploads: {
            ...order.supplierUploads,
            [upload.supplierId]: [...currentUploads, upload]
          }
        };
      })
    );
  }

  setSupplierUploads(
    orderId: string,
    uploadsBySupplier: Record<string, SupplierUploadResult[]>
  ): void {
    this.ordersState.update((orders) =>
      orders.map((order) => {
        if (order.id !== orderId) {
          return order;
        }

        const nextUploads = { ...order.supplierUploads };

        for (const [supplierId, uploads] of Object.entries(uploadsBySupplier)) {
          const existingUploads = nextUploads[supplierId] ?? [];
          nextUploads[supplierId] = this.mergeSupplierUploads(existingUploads, uploads);
        }

        return {
          ...order,
          supplierUploads: nextUploads
        };
      })
    );
  }

  private mergeSupplierUploads(
    existingUploads: SupplierUploadResult[],
    incomingUploads: SupplierUploadResult[]
  ): SupplierUploadResult[] {
    const uploadsByKey = new Map<string, SupplierUploadResult>();

    for (const upload of [...existingUploads, ...incomingUploads]) {
      uploadsByKey.set(this.supplierUploadKey(upload), upload);
    }

    return Array.from(uploadsByKey.values()).sort((left, right) => {
      const leftTime = this.parseUploadTime(left.uploadedAt);
      const rightTime = this.parseUploadTime(right.uploadedAt);
      return leftTime - rightTime;
    });
  }

  private supplierUploadKey(upload: SupplierUploadResult): string {
    return `${upload.supplierId}::${upload.fileName}::${upload.uploadedAt ?? ''}`;
  }

  private parseUploadTime(uploadedAt: string | null): number {
    if (!uploadedAt) {
      return 0;
    }

    const parsed = Date.parse(uploadedAt);
    return Number.isFinite(parsed) ? parsed : 0;
  }
}
