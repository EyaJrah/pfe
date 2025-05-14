import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './page/login/login.component';
import { SignUpComponent } from './page/sign-up/sign-up.component';
import { DashbordComponent } from './page/dashbord/dashbord.component';
import { ScanResultsComponent } from './page/scan-results/scan-results.component';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'dashbord', component: DashbordComponent }, // Ensure this is correct
  { path: 'signup', component: SignUpComponent },  // Signup route
  { path: 'scan-results', component: ScanResultsComponent },
  { path: '', redirectTo: '/login', pathMatch: 'full' }, // Default route
  { path: '**', redirectTo: '/login' } // Fallback route
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
