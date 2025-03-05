import { Routes } from '@angular/router';
import { LoginComponent } from './page/login/login.component';
import { LayoutComponent } from './page/layout/layout.component';
import { DashbordComponent } from './page/dashbord/dashbord.component';
import { SignUpComponent } from './page/sign-up/sign-up.component';


export const routes: Routes = [
    {
         path: '', redirectTo:'login' , pathMatch:'full'
    },
    { 
        path:'login',
        component:LoginComponent

    },
    {
        path:'',
        component:LayoutComponent,
        children:[
            {
                path:'dashbord',
                component:DashbordComponent
            }
        ]

    },
    { path: 'sign-up', 
        
    component: SignUpComponent 

    }, 
    
];
