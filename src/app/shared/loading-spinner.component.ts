import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-loading-spinner',
  template: `
    <div class="loading-spinner" [class.loading-spinner--compact]="size === 'compact'" [class.loading-spinner--full]="size === 'full'" role="status" aria-label="Loading">
      <svg class="loading-spinner__ring" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">
        <circle cx="12" cy="12" r="10" stroke-dasharray="31.4 31.4" stroke-dashoffset="0" />
      </svg>
    </div>
  `,
  styles: [`
    .loading-spinner {
      align-items: center;
      display: flex;
      justify-content: center;
    }

    .loading-spinner--full {
      height: 100%;
      min-height: 120px;
      width: 100%;
    }

    .loading-spinner--compact {
      display: inline-flex;
      height: 24px;
      width: 24px;
    }

    .loading-spinner__ring {
      animation: tr-spin 0.8s linear infinite;
      color: #1f6f50;
      height: 100%;
      width: 100%;
    }

    @keyframes tr-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `],
})
export class LoadingSpinnerComponent {
  @Input() size: 'compact' | 'full' = 'full';
}
