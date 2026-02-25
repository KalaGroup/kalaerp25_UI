import { Component, OnInit } from '@angular/core';
import {UntypedFormControl} from '@angular/forms';

@Component({
    selector: 'app-simple-autocomplete',
    templateUrl: './simple-autocomplete.component.html',
    styleUrls: ['./simple-autocomplete.component.scss'],
    standalone: false
})
export class SimpleAutocompleteComponent implements OnInit {

  myControl = new UntypedFormControl();
  options: string[] = ['One', 'Two', 'Three'];
  
  constructor() { }

  ngOnInit() {
  }

}
