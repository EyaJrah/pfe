import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css']
})
export class FooterComponent {
  constructor(private router: Router) {}

  refreshPage() {
    // D'abord naviguer vers le dashboard
    this.router.navigate(['/dashbord']).then(() => {
      // Puis rafraîchir la page
      window.location.reload();
    });
  }
}
