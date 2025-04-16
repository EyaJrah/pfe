// app.component.ts
import { Component, HostListener } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FooterComponent } from './shared/footer/footer.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, FooterComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'CheckSec';

  @HostListener('window:scroll', [])
  onWindowScroll() {
    const logoContainer = document.querySelector('.logo-container');
    if (logoContainer) {
      if (window.scrollY > 50) {
        logoContainer.classList.add('scrolled');
      } else {
        logoContainer.classList.remove('scrolled');
      }
    }
  }
}