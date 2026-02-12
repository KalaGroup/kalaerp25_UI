import { Routes } from '@angular/router';

import { HomeComponent } from './home.component';
import { Signin2Component } from '../sessions/signin2/signin2.component';


export const HomeRoutes: Routes = [
  { path: '', component: Signin2Component  }
];