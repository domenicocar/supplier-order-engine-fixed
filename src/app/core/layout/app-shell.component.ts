import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from '../../features/auth/services/auth.service';
import { AuthStore } from '../../features/auth/stores/auth.store';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="min-h-screen bg-slate-50">
      <header class="sticky top-0 z-20 border-b border-slate-200 bg-white/95">
        <div class="mx-auto flex max-w-[95rem] items-center justify-between gap-6 px-4 py-4 sm:px-6 lg:px-8">
          <div class="flex items-center gap-4">
            <a
              routerLink="/landing"
              class="flex items-center gap-3 text-slate-950 no-underline"
            >
              <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-sm font-semibold text-white">
                SO
              </span>
              <div>
                <p class="font-heading text-lg font-semibold tracking-tight">
                  Supplier Order Engine
                </p>
                <p class="text-sm text-slate-500">Frontend V0</p>
              </div>
            </a>
          </div>

          <nav class="flex items-center gap-2 rounded-full border border-slate-200 bg-white p-1">
            <a
              routerLink="/landing"
              routerLinkActive="bg-slate-950 text-white"
              [routerLinkActiveOptions]="{ exact: true }"
              class="rounded-full px-4 py-2 text-sm font-medium text-slate-600 transition hover:text-slate-950"
            >
              Landing
            </a>
            <a
              routerLink="/app/orders"
              routerLinkActive="bg-slate-950 text-white"
              class="rounded-full px-4 py-2 text-sm font-medium text-slate-600 transition hover:text-slate-950"
            >
              Ordini
            </a>
          </nav>

          <div class="flex items-center gap-3">
            @if (authStore.user(); as user) {
              <span class="text-sm text-slate-500">{{ user.email }}</span>
            }
            <button
              type="button"
              class="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              (click)="signOut()"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main class="mx-auto max-w-[95rem] px-4 py-8 sm:px-6 lg:px-8">
        @if (authStore.suspendedMessage(); as suspendedMessage) {
          <div class="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {{ suspendedMessage }}
          </div>
        }
        <router-outlet />
      </main>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppShellComponent {
  readonly authStore = inject(AuthStore);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  async signOut(): Promise<void> {
    await this.authService.signOut();
    await this.router.navigate(['/login']);
  }
}
