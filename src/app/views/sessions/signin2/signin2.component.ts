import { AfterViewInit, Component,ViewChild, OnDestroy, OnInit } from '@angular/core';
import { UntypedFormGroup, UntypedFormBuilder, UntypedFormControl, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButton as MatButton } from '@angular/material/button';
import { MatProgressBar as MatProgressBar } from '@angular/material/progress-bar';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AppLoaderService } from '../../../shared/services/app-loader/app-loader.service';
import { JwtAuthService } from '../../../shared/services/auth/jwt-auth.service';


@Component({
    selector: 'app-signin2',
    templateUrl: './signin2.component.html',
    styleUrls: ['./signin2.component.scss'],
    standalone: false
})
export class Signin2Component implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild(MatProgressBar) progressBar: MatProgressBar;
  @ViewChild(MatButton) submitButton: MatButton;

  signinForm: UntypedFormGroup;
  errorMsg = '';

  private _unsubscribeAll: Subject<any>;

  constructor( private jwtAuth: JwtAuthService,
    private egretLoader: AppLoaderService,
    private router: Router,
    private route: ActivatedRoute) 
    {
      this._unsubscribeAll = new Subject();
  }

  ngOnInit() {
    this.signinForm = new UntypedFormGroup({
      username: new UntypedFormControl('', Validators.required),
      password: new UntypedFormControl('', Validators.required),
      rememberMe: new UntypedFormControl(true)
    });

    // this.route.queryParams
    //   .pipe(takeUntil(this._unsubscribeAll))
    //   .subscribe(params => this.return = params['return'] || '/');
  }

  ngAfterViewInit() {
    // this.autoSignIn();
  }

  ngOnDestroy() {
    this._unsubscribeAll.next(1);
    this._unsubscribeAll.complete();
  }

  signin() {
    const signinData = this.signinForm.value
    this.submitButton.disabled = true;
    //this.progressBar.mode = 'indeterminate';
    
    this.jwtAuth.signin(signinData.username, signinData.password)
    .subscribe(response => {
      console.log('Success');
      console.log(this.jwtAuth.return);
      this.router.navigateByUrl(this.jwtAuth.return);
    }, err => {
      this.submitButton.disabled = false;
      this.errorMsg = err;//.error?.message||'Incorrect username or password..!';
      // console.log(err);
    })
  }

  autoSignIn() {    
    if(this.jwtAuth.return === '/') {
      return
    }
    this.egretLoader.open(`Automatically Signing you in! \n Return url: ${this.jwtAuth.return.substring(0, 20)}...`, {width: '320px'});
    setTimeout(() => {
      this.signin();
      console.log('autoSignIn');
      this.egretLoader.close()
    }, 2000);
  }

  onSubmit() {
    debugger;
    if (this.signinForm.invalid) {
      // do what you wnat with your data
      console.log(this.signinForm.value);
    }
  }
}
