import { Component, OnInit } from '@angular/core';
import {UntypedFormControl} from '@angular/forms';

@Component({
    selector: 'app-multiple-select',
    templateUrl: './multiple-select.component.html',
    styleUrls: ['./multiple-select.component.scss'],
    standalone: false
})
export class MultipleSelectComponent implements OnInit {

  toppings = new UntypedFormControl();
  toppingList: string[] = ['Extra cheese', 'Mushroom', 'Onion', 'Pepperoni', 'Sausage', 'Tomato'];
  
  constructor() { }

  ngOnInit() {
  }

}
