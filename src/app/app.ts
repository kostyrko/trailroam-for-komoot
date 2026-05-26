import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly isLoginRequiredVisible = signal(false);

  protected showLoginRequired(): void {
    this.isLoginRequiredVisible.set(true);
  }

  protected retrySessionCheck(): void {
    this.isLoginRequiredVisible.set(true);
  }
}
