import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LayoutModule } from '@angular/cdk/layout';

import { FontSizeDirective } from './font-size.directive';
import { ScrollToDirective } from './scroll-to.directive';
import { AppDropdownDirective } from './dropdown.directive';
import { DropdownAnchorDirective } from './dropdown-anchor.directive';
import { DropdownLinkDirective } from './dropdown-link.directive';
import { EgretSideNavToggleDirective } from './egret-side-nav-toggle.directive';
import { EgretSidenavHelperDirective, EgretSidenavTogglerDirective } from './egret-sidenav-helper/egret-sidenav-helper.directive';
import { EgretHighlightDirective } from './egret-highlight.directive';
import { AutoFocusDirective } from './auto-focus.directive';


const directives = [
  AutoFocusDirective,
  FontSizeDirective,
  ScrollToDirective,
  AppDropdownDirective,
  DropdownAnchorDirective,
  DropdownLinkDirective,
  EgretSideNavToggleDirective,
  EgretSidenavHelperDirective,
  EgretSidenavTogglerDirective,
  EgretHighlightDirective
]

@NgModule({
  imports: [
    CommonModule,
    LayoutModule
  ],
  declarations: directives,
  exports: directives
})
export class SharedDirectivesModule { }