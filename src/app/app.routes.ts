import { Routes } from '@angular/router';
import { LoginComponent } from './page/login/login.component';
import { LayoutComponent } from './page/layout/layout.component';
import { DashbordComponent } from './page/dashbord/dashbord.component';
import { SignUpComponent } from './page/sign-up/sign-up.component';
import { ScanResultsComponent } from './page/scan-results/scan-results.component';
import { AboutComponent } from './page/about/about.component';
import { ContactComponent } from './page/contact/contact.component';
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
    {
        path: '', 
        redirectTo: 'login',
        pathMatch: 'full'
    },
    { 
        path: 'login',
        component: LoginComponent
    },
    {
        path: 'sign-up',
        component: SignUpComponent
    },
    {
        path: '',
        component: LayoutComponent,
        canActivate: [AuthGuard],
        children: [
            {
                path: 'dashbord',
                component: DashbordComponent
            },
            {
                path: 'scan-results',
                component: ScanResultsComponent
            },
            {
                path: 'about',
                component: AboutComponent
            },
            {
                path: 'contact',
                component: ContactComponent
            }
        ]
    }
];
