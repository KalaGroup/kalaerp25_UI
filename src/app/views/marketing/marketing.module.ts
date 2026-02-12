import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MofNfaLevelComponent } from './mof-nfa-level/mof-nfa-level.component';
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatRadioModule } from '@angular/material/radio';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatListModule } from '@angular/material/list';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatFormFieldModule } from '@angular/material/form-field';
import { PpcMarketingRoutes } from './marketing.routing';



@NgModule({
  declarations: [
    MofNfaLevelComponent
  ],
  imports: [
  CommonModule,
      MatInputModule,
      FormsModule,
      MatIconModule,
      MatCardModule,
      MatMenuModule,
      MatProgressBarModule,
      MatExpansionModule,
      MatRadioModule,
      MatButtonModule,
      MatChipsModule,
      MatListModule,
      MatTabsModule,
      MatTableModule,
      MatGridListModule,
      MatFormFieldModule,
      RouterModule.forChild(PpcMarketingRoutes)
]
})
export class PpcMarketingModule { }
