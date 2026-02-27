import { Component, OnInit } from '@angular/core';

@Component({
    selector: 'app-basic-expansion-panel',
    templateUrl: './basic-expansion-panel.component.html',
    styleUrls: ['./basic-expansion-panel.component.scss'],
    standalone: false
})
export class BasicExpansionPanelComponent implements OnInit {

  panelOpenState = false;
  
  constructor() { }

  ngOnInit() {
  }

}
