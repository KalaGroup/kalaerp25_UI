import { Component, OnInit } from '@angular/core';

@Component({
    selector: 'app-custom-bar',
    templateUrl: './custom-bar.component.html',
    styleUrls: ['./custom-bar.component.scss'],
    standalone: false
})
export class CustomBarComponent implements OnInit {

  color = 'primary';
  mode = 'determinate';
  value = 50;
  bufferValue = 75;
  
  constructor() { }

  ngOnInit() {
  }

}
