import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../services/auth.service';
import { AuthStore } from '../stores/auth.store';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="min-h-screen bg-slate-50">
      <div class="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6 py-12">
        <div class="grid w-full max-w-5xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div class="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
            <span class="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-medium text-slate-700">
              Supplier Order Engine
            </span>

            <h1 class="mt-6 text-4xl font-bold tracking-tight text-slate-950">
              Accedi con Supabase Auth
            </h1>

            <p class="mt-4 max-w-2xl text-base leading-7 text-slate-600">
              Il token Supabase viene inviato automaticamente al backend NestJS multi-tenant come
              <code class="rounded bg-slate-900/5 px-1.5 py-0.5 text-xs text-slate-700">Authorization: Bearer &lt;jwt&gt;</code>.
            </p>

            @if (authStore.suspendedMessage(); as suspendedMessage) {
              <div class="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {{ suspendedMessage }}
              </div>
            }
          </div>

          <div class="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
            <form class="flex flex-col gap-5" (ngSubmit)="submit()">
              <div>
                <label for="email" class="mb-2 block text-sm font-medium text-slate-700">Email</label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  [(ngModel)]="email"
                  class="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-950"
                  autocomplete="email"
                  required
                />
              </div>

              <div>
                <label for="password" class="mb-2 block text-sm font-medium text-slate-700">Password</label>
                <input
                  id="password"
                  type="password"
                  name="password"
                  [(ngModel)]="password"
                  class="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-950"
                  autocomplete="current-password"
                  required
                />
              </div>

              @if (error(); as currentError) {
                <div class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {{ currentError }}
                </div>
              }

              <button
                type="submit"
                class="mt-2 inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                [disabled]="submitting() || authStore.loading()"
              >
                {{ submitting() ? 'Accesso in corso...' : 'Accedi' }}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginPageComponent {
  private readonly authService = inject(AuthService);
  readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);

  email = '';
  password = '';
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    effect(() => {
      if (this.authStore.isAuthenticated()) {
        void this.router.navigate(['/app/orders']);
      }
    });
  }

  async submit(): Promise<void> {
    this.submitting.set(true);
    this.error.set(null);
    this.authStore.setSuspendedMessage(null);

    try {
      const response = await this.authService.signIn(this.email, this.password);

      if (response.error) {
        this.error.set(response.error.message || 'Login non riuscito.');
        return;
      }

      await this.authStore.initialize();
      await this.router.navigate(['/app/orders']);
    } catch (error: unknown) {
      this.error.set(error instanceof Error ? error.message : 'Login non riuscito.');
    } finally {
      this.submitting.set(false);
    }
  }
}
