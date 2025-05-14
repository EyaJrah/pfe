import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { ScanResultsComponent } from './page/scan-results/scan-results.component';
import { ScanService } from './services/scan.service';

@NgModule({
  declarations: [
    AppComponent,
    ScanResultsComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    FormsModule,
    RouterModule.forRoot([
      { path: 'scan-results', component: ScanResultsComponent },
      { path: '', redirectTo: '/scan-results', pathMatch: 'full' }
    ])
  ],
  providers: [ScanService],
  bootstrap: [AppComponent]
})
export class AppModule { } 