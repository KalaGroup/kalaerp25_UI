import { Directive, ElementRef, Attribute, OnInit } from '@angular/core';

@Directive({
    selector: '[fontSize]',
    standalone: false
})
export class FontSizeDirective implements OnInit {
  constructor( @Attribute('fontSize') public fontSize: string, private el: ElementRef) { }
  ngOnInit() {
    this.el.nativeElement.fontSize = this.fontSize;
  }
}
