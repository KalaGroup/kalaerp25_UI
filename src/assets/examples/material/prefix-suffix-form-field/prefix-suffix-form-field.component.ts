import { Component, OnInit } from '@angular/core';

@Component({
    selector: 'app-prefix-suffix-form-field',
    templateUrl: './prefix-suffix-form-field.component.html',
    styleUrls: ['./prefix-suffix-form-field.component.scss'],
    standalone: false
})
export class PrefixSuffixFormFieldComponent implements OnInit {

  hide = true;
  
  constructor() { }

  ngOnInit() {
  }

}
