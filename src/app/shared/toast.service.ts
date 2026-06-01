import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface ToastMessage {
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toast$ = new Subject<ToastMessage | null>();

  show(message: string): void {
    this.toast$.next({ message });
  }

  dismiss(): void {
    this.toast$.next(null);
  }
}
