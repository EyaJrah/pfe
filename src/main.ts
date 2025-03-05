import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideRouter, Routes } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { LoginComponent } from './app/page/login/login.component';
import { SignUpComponent } from './app/page/sign-up/sign-up.component'; // Import your SignUpComponent
import { DashbordComponent } from './app/page/dashbord/dashbord.component'; // Import your DashboardComponent

// Define your routes
const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'signup', component: SignUpComponent },  // Add the signup route
  { path: 'dashbord', component: DashbordComponent }, // Add the dashboard route
  { path: '', redirectTo: '/login', pathMatch: 'full' }, // Redirect to login by default
  { path: '**', redirectTo: '/login' } // Fallback route
];

// Start the application with AppComponent
bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes), // Configure the router
    provideHttpClient() // Provide HttpClient if you're using it
  ]
}).catch(err => console.error(err));
