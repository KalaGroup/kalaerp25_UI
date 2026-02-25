import { Component, OnInit } from '@angular/core';

@Component({
    selector: 'app-ngmodel-radio',
    templateUrl: './ngmodel-radio.component.html',
    styleUrls: ['./ngmodel-radio.component.scss'],
    standalone: false
})
export class NgmodelRadioComponent implements OnInit {

  favoriteSeason: string;
  seasons: string[] = ['Winter', 'Spring', 'Summer', 'Autumn'];
  
  constructor() { }

  ngOnInit() {
  }

}
