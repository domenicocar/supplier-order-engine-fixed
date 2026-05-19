import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { TableModule } from 'primeng/table';

import { OrderExportResult } from '../../../models/order.models';
import { StatusTagComponent } from '../../../shared/components/status-tag.component';
import {
  OrderExportOverview,
  OrderExportSummaryRow,
  SupplierExportSummary,
} from './order-detail-view.models';
import {
  formatPrice,
  reviewReason,
  severityTone,
} from './order-detail-view.utils';

@Component({
  selector: 'app-order-export-tab',
  standalone: true,
  imports: [
    ButtonModule,
    StatusTagComponent,
    TableModule,
    DropdownModule,
    FormsModule,
  ],
  template: `
    <section class="surface-panel p-8">
      <!-- Intestazione -->
      <div
        class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"
      >
        <div>
          <p class="section-eyebrow">1. Export</p>
          <h2 class="section-title">Riepilogo ordine ed export</h2>
          <p class="section-copy">
            Overview finale di cosa stai ordinando, quanto spenderai in modo
            stimato e da quali fornitori, con CTA finale di export su
            <code
              class="rounded bg-slate-900/5 px-1.5 py-0.5 text-xs text-slate-700"
            >
              POST /orders/:id/export </code
            >.
          </p>
        </div>

        <button
          pButton
          type="button"
          class="justify-center !rounded-2xl !bg-slate-950 !px-6 !py-3 !text-sm !font-semibold !text-white"
          [disabled]="exporting()"
          (click)="exportRequested.emit()"
        >
          {{ exporting() ? 'Export in corso...' : 'Esporta ordine' }}
        </button>
      </div>

      @if (overview(); as currentOverview) {
        <!-- Statistiche -->
        <div class="mt-8 grid gap-4 lg:grid-cols-4">
          <div class="stat-tile">
            <p class="stat-label">Spesa stimata</p>
            <p class="stat-value">
              {{ formatPrice(currentOverview.estimatedTotal) }}
            </p>
          </div>
          <div class="stat-tile">
            <p class="stat-label">Prodotti</p>
            <p class="stat-value">{{ currentOverview.productsCount }}</p>
          </div>
          <div class="stat-tile">
            <p class="stat-label">Fornitori coinvolti</p>
            <p class="stat-value">{{ currentOverview.suppliersCount }}</p>
          </div>
          <div class="stat-tile">
            <p class="stat-label">Totale pezzi</p>
            <p class="stat-value">{{ currentOverview.totalQuantity }}</p>
          </div>
        </div>

        <!-- Warning Lacune -->
        @if (
          currentOverview.missingItemsCount > 0 ||
          currentOverview.missingPricesCount > 0 ||
          currentOverview.missingQuantitiesCount > 0
        ) {
          <div
            class="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900"
          >
            <p class="font-semibold text-amber-950">
              Riepilogo stimato e non ancora completo.
            </p>
            <div class="mt-2 flex flex-wrap gap-2">
              @if (currentOverview.missingItemsCount > 0) {
                <span
                  class="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-amber-900"
                >
                  {{ currentOverview.missingItemsCount }} prodotti non trovati
                  nei fornitori
                </span>
              }
              @if (currentOverview.assignedItemsCount > 0) {
                <span
                  class="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-amber-900"
                >
                  {{ currentOverview.assignedItemsCount }} prodotti assegnati a
                  un fornitore
                </span>
              }
              @if (currentOverview.missingPricesCount > 0) {
                <span
                  class="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-amber-900"
                >
                  {{ currentOverview.missingPricesCount }} prodotti senza prezzo
                </span>
              }
              @if (currentOverview.missingQuantitiesCount > 0) {
                <span
                  class="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-amber-900"
                >
                  {{ currentOverview.missingQuantitiesCount }} prodotti senza
                  quantita
                </span>
              }
            </div>
          </div>
        }

        <!-- Sezione Fornitori -->
        <div class="mt-8">
          <div class="rounded-3xl border border-slate-200 bg-white p-5">
            <div
              class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <h3 class="text-base font-semibold text-slate-950">
                  Per fornitore
                </h3>
                <span class="text-sm text-slate-500">spaccato acquisti</span>
              </div>

              <!-- Barra di ricerca prodotti -->
              <input
                type="text"
                [ngModel]="searchProduct()"
                (ngModelChange)="searchProduct.set($event)"
                placeholder="Cerca prodotto per nome o EAN..."
                class="w-full sm:w-72 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition-colors focus:border-slate-500"
              />
            </div>

            @if (filteredSuppliers().length === 0) {
              <p class="mt-4 text-sm text-slate-500">
                Nessun fornitore o prodotto corrispondente alla ricerca.
              </p>
            } @else {
              <!-- Lista Fornitori (Senza Scroll Esterno) -->
              <ul class="mt-4 grid gap-4">
                @for (
                  supplier of filteredSuppliers();
                  track supplier.supplierId || supplier.supplierName
                ) {
                  <li
                    class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700"
                  >
                    <div class="flex items-start justify-between gap-4">
                      <div>
                        <p class="font-medium text-slate-950">
                          {{ supplier.supplierName }}
                        </p>
                        <p
                          class="mt-1 text-xs uppercase tracking-[0.15em] text-slate-400"
                        >
                          {{ supplier.supplierId || 'non assegnato' }}
                        </p>
                      </div>
                      <!-- Subtotale originario del fornitore -->
                      <p class="text-lg font-semibold text-slate-950">
                        {{ formatPrice(supplier.subtotal) }}
                      </p>
                    </div>

                    <div class="mt-4 grid grid-cols-3 gap-3">
                      <div
                        class="rounded-2xl bg-white px-3 py-2 border border-slate-100"
                      >
                        <p
                          class="text-[11px] uppercase tracking-[0.14em] text-slate-400"
                        >
                          Prodotti Totali
                        </p>
                        <p class="mt-1 font-semibold text-slate-950">
                          {{ supplier.lineCount }}
                        </p>
                      </div>
                      <div
                        class="rounded-2xl bg-white px-3 py-2 border border-slate-100"
                      >
                        <p
                          class="text-[11px] uppercase tracking-[0.14em] text-slate-400"
                        >
                          Pezzi
                        </p>
                        <p class="mt-1 font-semibold text-slate-950">
                          {{ supplier.totalQuantity }}
                        </p>
                      </div>
                      <div
                        class="rounded-2xl bg-white px-3 py-2 border border-slate-100"
                      >
                        <p
                          class="text-[11px] uppercase tracking-[0.14em] text-slate-400"
                        >
                          Lacune
                        </p>
                        <p class="mt-1 font-semibold text-slate-950">
                          {{
                            supplier.missingPricesCount +
                              supplier.missingQuantitiesCount
                          }}
                        </p>
                      </div>
                    </div>

                    <div
                      class="mt-4 rounded-2xl border border-slate-200 bg-white p-3"
                    >
                      <p
                        class="text-[11px] uppercase tracking-[0.14em] text-slate-400 mb-3"
                      >
                        Cosa stai comprando da questo fornitore ({{
                          supplier.items.length
                        }})
                      </p>
                      <!-- Sub-lista prodotti CON scroll interno -->
                      <ul class="grid gap-2 max-h-[300px] overflow-y-auto pr-2">
                        @for (item of supplier.items; track item.ean) {
                          <li
                            class="flex items-start justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 border border-slate-100"
                          >
                            <div>
                              <p class="font-medium text-slate-950">
                                {{ item.description }}
                              </p>
                              <p
                                class="mt-1 text-xs uppercase tracking-[0.14em] text-slate-400"
                              >
                                {{ item.ean }}
                              </p>
                            </div>
                            <div class="text-right shrink-0">
                              <p class="font-medium text-slate-950">
                                x{{ item.quantity ?? '-' }} cart.
                                @if (item.packageSize > 1) {
                                  · conf. {{ item.packageSize }}
                                }
                              </p>
                              @if (item.totalPieces !== null) {
                                <p class="mt-1 text-xs text-slate-500">
                                  {{ item.totalPieces }} pezzi
                                </p>
                              }
                              <p class="mt-1 text-xs text-slate-500">
                                {{ formatPrice(item.lineTotal) }}
                              </p>
                            </div>
                          </li>
                        }
                      </ul>
                    </div>
                  </li>
                }
              </ul>
            }
          </div>
        </div>

        <!-- Sezione Dettaglio Ordine -->
        <div class="mt-8 rounded-3xl border border-slate-200 bg-white p-5">
          <div class="flex items-center justify-between gap-4">
            <div>
              <h3 class="text-base font-semibold text-slate-950">
                Dettaglio ordine
              </h3>
              <span class="text-sm text-slate-500"
                >copertura del tuo ordine</span
              >
            </div>
          </div>

          @if (missingRows().length > 0) {
            <div
              class="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900"
            >
              <p class="font-semibold text-amber-950">
                {{ missingRows().length }} prodotti del tuo ordine non sono
                stati trovati tra i fornitori caricati.
              </p>
            </div>
          }

          <div class="mt-4 overflow-hidden rounded-2xl border border-slate-200">
            <!-- Scroll nativo di PrimeNG, niente paginazione -->
            <p-table
              #dtDettaglio
              [value]="summaryRows()"
              [globalFilterFields]="['ean', 'description', 'supplierName']"
              [scrollable]="true"
              scrollHeight="500px"
              styleClass="p-datatable-sm"
            >
              <ng-template pTemplate="caption">
                <div class="flex justify-end">
                  <input
                    type="text"
                    (input)="
                      dtDettaglio.filterGlobal(
                        $any($event.target).value,
                        'contains'
                      )
                    "
                    placeholder="Cerca EAN, Prodotto o Fornitore..."
                    class="w-full sm:w-72 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition-colors focus:border-slate-500"
                  />
                </div>
              </ng-template>

              <ng-template pTemplate="header">
                <tr>
                  <th>EAN</th>
                  <th>Prodotto</th>
                  <th>Cartoni</th>
                  <th>Confezione</th>
                  <!-- Colonna con Filtro Dropdown -->
                  <th>
                    <div class="flex items-center gap-2">
                      Copertura
                      <p-columnFilter
                        field="foundInSuppliers"
                        matchMode="equals"
                        display="menu"
                        [showMatchModes]="false"
                        [showOperator]="false"
                        [showAddButton]="false"
                      >
                        <ng-template
                          pTemplate="filter"
                          let-value
                          let-filter="filterCallback"
                        >
                          <p-dropdown
                            [ngModel]="value"
                            [options]="coverageOptions"
                            (onChange)="filter($event.value)"
                            placeholder="Filtra Copertura"
                            [showClear]="true"
                          >
                          </p-dropdown>
                        </ng-template>
                      </p-columnFilter>
                    </div>
                  </th>
                  <th>Fornitore</th>
                  <th>Prezzo</th>
                  <th>Totale</th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-item>
                <tr>
                  <td>{{ item.ean }}</td>
                  <td>{{ item.description }}</td>
                  <td>{{ item.quantity ?? '-' }}</td>
                  <td>
                    {{
                      item.packageSize > 1 ? 'conf. ' + item.packageSize : '-'
                    }}
                  </td>
                  <td>
                    @if (item.foundInSuppliers) {
                      <div class="flex flex-col">
                        <span
                          class="inline-flex w-fit rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"
                        >
                          Trovato
                        </span>
                        <span class="mt-1 text-xs text-slate-500"
                          >{{ item.availableSuppliersCount }} fornitori
                          disp.</span
                        >
                      </div>
                    } @else {
                      <div class="flex flex-col">
                        <span
                          class="inline-flex w-fit rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800"
                        >
                          Non trovato
                        </span>
                        <span class="mt-1 text-xs text-amber-800">{{
                          item.missingReason
                        }}</span>
                      </div>
                    }
                  </td>
                  <td>
                    <div class="flex flex-col">
                      <span class="font-medium text-slate-950">{{
                        item.supplierName || 'Non assegnato'
                      }}</span>
                      @if (item.supplierId) {
                        <span
                          class="text-xs uppercase tracking-[0.14em] text-slate-400"
                          >{{ item.supplierId }}</span
                        >
                      }
                    </div>
                  </td>
                  <td>
                    <div class="flex flex-col">
                      <span>{{ formatPrice(item.unitPrice) }}</span>
                      @if (item.packPrice !== null && item.packageSize > 1) {
                        <span class="text-xs text-slate-500"
                          >{{ formatPrice(item.packPrice) }} / conf.</span
                        >
                      }
                    </div>
                  </td>
                  <td>{{ formatPrice(item.lineTotal) }}</td>
                </tr>
              </ng-template>
              <ng-template pTemplate="emptymessage">
                <tr>
                  <td colspan="8" class="text-center p-4 text-slate-500">
                    Nessun prodotto trovato.
                  </td>
                </tr>
              </ng-template>
            </p-table>
          </div>
        </div>
      } @else {
        <p
          class="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-500"
        >
          Il riepilogo ordine si popola quando hai i prodotti confrontati con i
          fornitori: qui vedrai spesa stimata, cosa stai prendendo e da chi
          prima dell'export.
        </p>
      }

      @if (exportResult(); as currentExportResult) {
        <div class="mt-8 grid gap-4 lg:grid-cols-4">
          <div class="stat-tile">
            <p class="stat-label">File esportati</p>
            <p class="stat-value">
              {{ currentExportResult.filesExported.length }}
            </p>
          </div>
          <div class="stat-tile">
            <p class="stat-label">Review items</p>
            <p class="stat-value">
              {{ currentExportResult.reviewItems.length }}
            </p>
          </div>
          <div class="stat-tile">
            <p class="stat-label">Can complete export</p>
            <p class="stat-value">
              {{ currentExportResult.canCompleteExport ? 'Si' : 'No' }}
            </p>
          </div>
          <div class="stat-tile">
            <p class="stat-label">Errori export</p>
            <p class="stat-value">
              {{ currentExportResult.erroriExport.length }}
            </p>
          </div>
        </div>

        <div class="mt-8 grid gap-6 xl:grid-cols-2">
          <!-- File esportati con Scroll Interno -->
          <div class="rounded-3xl border border-slate-200 bg-white p-5">
            <h3 class="text-base font-semibold text-slate-950">
              File esportati
            </h3>

            @if (currentExportResult.filesExported.length === 0) {
              <p class="mt-4 text-sm text-slate-500">
                Nessun file esportato restituito dal backend.
              </p>
            } @else {
              <ul class="mt-4 grid gap-3 max-h-64 overflow-y-auto pr-2">
                @for (
                  file of currentExportResult.filesExported;
                  track file.name
                ) {
                  <li
                    class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
                  >
                    <div class="flex items-center justify-between gap-3">
                      <span class="font-medium text-slate-950">{{
                        file.name
                      }}</span>
                      @if (file.status) {
                        <app-status-tag [label]="file.status" />
                      }
                    </div>
                    @if (file.supplierId) {
                      <p
                        class="mt-1 text-xs uppercase tracking-[0.15em] text-slate-400"
                      >
                        {{ file.supplierId }}
                      </p>
                    }
                  </li>
                }
              </ul>
            }
          </div>

          <!-- Errori Export con Scroll Interno -->
          <div class="rounded-3xl border border-slate-200 bg-white p-5">
            <h3 class="text-base font-semibold text-slate-950">
              Errori export
            </h3>

            @if (currentExportResult.erroriExport.length === 0) {
              <p class="mt-4 text-sm text-slate-500">
                Nessun errore export segnalato.
              </p>
            } @else {
              <ul class="mt-4 grid gap-3 max-h-64 overflow-y-auto pr-2">
                @for (item of currentExportResult.erroriExport; track item) {
                  <li
                    class="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
                  >
                    {{ item }}
                  </li>
                }
              </ul>
            }
          </div>
        </div>

        @if (currentExportResult.reviewItems.length > 0) {
          <!-- Tabella Review Items con paginazione e ricerca -->
          <div class="mt-6 overflow-hidden rounded-2xl border border-slate-200">
            <p-table
              #dtReview
              [value]="currentExportResult.reviewItems"
              [paginator]="true"
              [rows]="10"
              [rowsPerPageOptions]="[10, 25, 50]"
              [globalFilterFields]="['ean', 'description']"
              responsiveLayout="scroll"
            >
              <ng-template pTemplate="caption">
                <div class="flex justify-end">
                  <input
                    type="text"
                    (input)="
                      dtReview.filterGlobal(
                        $any($event.target).value,
                        'contains'
                      )
                    "
                    placeholder="Cerca nelle revisioni..."
                    class="w-full sm:w-72 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition-colors focus:border-slate-500"
                  />
                </div>
              </ng-template>
              <ng-template pTemplate="header">
                <tr>
                  <th>EAN</th>
                  <th>Descrizione</th>
                  <th>Motivazione</th>
                  <th>Severità</th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-item>
                <tr>
                  <td>{{ item.ean }}</td>
                  <td>{{ item.description || '-' }}</td>
                  <td>{{ reviewReason(item) }}</td>
                  <td>
                    <app-status-tag
                      [label]="item.severity || 'warning'"
                      [tone]="severityTone(item.severity)"
                    />
                  </td>
                </tr>
              </ng-template>
            </p-table>
          </div>
        }
      } @else {
        <p
          class="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-500"
        >
          Nessun export eseguito per questo ordine nella sessione corrente.
        </p>
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderExportTabComponent {
  readonly exporting = input(false);
  readonly overview = input<OrderExportOverview | null>(null);
  readonly supplierSummary = input<SupplierExportSummary[]>([]);
  readonly summaryRows = input<OrderExportSummaryRow[]>([]);
  readonly missingRows = input<OrderExportSummaryRow[]>([]);
  readonly exportResult = input<OrderExportResult | undefined>(undefined);

  readonly exportRequested = output<void>();

  readonly formatPrice = formatPrice;
  readonly reviewReason = reviewReason;
  readonly severityTone = severityTone;

  readonly coverageOptions = [
    { label: 'Trovato', value: true },
    { label: 'Non trovato', value: false },
  ];

  // Gestione ricerca specifica tra i *prodotti* all'interno dei fornitori
  readonly searchProduct = signal('');

  readonly filteredSuppliers = computed(() => {
    const term = this.searchProduct().toLowerCase().trim();
    const suppliers = this.supplierSummary();

    if (!term) return suppliers;

    return (
      suppliers
        .map((supplier) => {
          // Filtriamo gli "item" (prodotti) all'interno del singolo fornitore
          const filteredItems = supplier.items.filter(
            (item) =>
              item.description?.toLowerCase().includes(term) ||
              item.ean?.toLowerCase().includes(term),
          );

          // Restituiamo una copia del fornitore ma SOLO con i prodotti matchati
          return {
            ...supplier,
            items: filteredItems,
          };
        })
        // Rimuoviamo i fornitori che non hanno nemmeno un prodotto corrispondente alla ricerca
        .filter((supplier) => supplier.items.length > 0)
    );
  });
}
