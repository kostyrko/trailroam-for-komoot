import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface ToastMessage {
  message: string;
  durationMs?: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toast$ = new Subject<ToastMessage | null>();

  show(message: string, durationMs: number = 3000): void {
    this.toast$.next({ message, durationMs });
  }

  dismiss(): void {
    this.toast$.next(null);
  }
}
