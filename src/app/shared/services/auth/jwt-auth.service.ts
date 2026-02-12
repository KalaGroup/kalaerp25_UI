import { Injectable } from '@angular/core';
import { LocalStoreService } from '../local-store.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';
import { map, catchError, delay } from 'rxjs/operators';
import { User } from '../../models/user.model';
import { of, BehaviorSubject, throwError } from 'rxjs';
import { environment } from 'environments/environment';

@Injectable({
  providedIn: 'root',
})
export class JwtAuthService {
  token;
  isAuthenticated: Boolean;
  user: User = {};
  user$ = new BehaviorSubject<User>(this.user);
  signingIn: Boolean;
  return: string;
  JWT_TOKEN = 'JWT_TOKEN';
  APP_USER = 'EGRET_USER';
  APP_USER_ID = 'APP_USER_ID';

  private baseUrl = environment.apiURL + 'UserAuthentication/';

  constructor(
    private ls: LocalStoreService,
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.route.queryParams.subscribe(
      (params) => (this.return = params['return'] || '/dashboard')
    );

    // On app init/refresh: restore credentials if token exists
    this.restoreCredentialsOnRefresh();
  }

  private credentialsSubject = new BehaviorSubject<{
    userid: string;
    password: string;
  } | null>(null);
  public credentials$ = this.credentialsSubject.asObservable();

  // Restore credentials on page refresh
  private restoreCredentialsOnRefresh(): void {
    const token = this.getJwtToken();
    const userId = localStorage.getItem(this.APP_USER_ID);

    if (token && userId) {
      console.log('Restoring credentials on refresh for user:', userId);
      // Emit credentials so NavigationService can fetch menu
      this.credentialsSubject.next({ userid: userId, password: '' });
    }
  }

  // Get current credentials synchronously
  public getCredentials(): { userid: string; password: string } | null {
    return this.credentialsSubject.getValue();
  }

  public signin(userid: string, password: string) {
    this.signingIn = true; // Set signingIn to true to indicate loading
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Accept: 'application/json',
    });
    const payload = { UserId: userid, password: password };

    return this.http
      .post(`${this.baseUrl}LoginUser`, payload, { headers })
      .pipe(
        map((res: any) => {
          console.log('API call success:', res); // Log the response for debugging
          localStorage.setItem('ProfitCenter', res.pccode);
          localStorage.setItem('companyName', res.companyName);
          localStorage.setItem('companyId', res.companyId);
          localStorage.setItem('userName', res.username);
          localStorage.setItem('employeeCode', res.empCode);
          localStorage.setItem('profitCenterName', res.profitCenterName);
          localStorage.setItem(this.APP_USER_ID, userid); // store userid
          // ⭐ Store logged-in UserId in localStorage
          this.setUserAndToken(res.token, res.user, !!res);
          this.credentialsSubject.next({ userid, password });
          this.signingIn = false; // Reset signingIn state
          return res;
        }),
        catchError((error) => {
          console.error('API call error:', error); // Log the error for debugging
          this.signingIn = false; // Reset signingIn state on error
          let errorMessage = 'Incorrect username or password!';
          if (error.error && error.error.message) {
            errorMessage = error.error.message; // Get custom error message from response
          }
          // return throwError(() => error); // Propagate error
          return throwError(() => new Error(errorMessage));
        })
      );
  }

  /*
    checkTokenIsValid is called inside constructor of
    shared/components/layouts/admin-layout/admin-layout.component.ts
  */
  public checkTokenIsValid() {
    const token = this.getJwtToken(); // Get the JWT token from local storage
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`, // Include the token in the Authorization header
    });

    return this.http.get(`${this.baseUrl}Validate-Token`, { headers }).pipe(
      map((response: any) => {
        // If the token is valid, set the user and token in local storage
        this.setUserAndToken(token, response, true); // Assuming the response contains user data
        // Also restore credentials after token validation
        const userId = localStorage.getItem(this.APP_USER_ID);
        if (userId && !this.credentialsSubject.getValue()) {
          this.credentialsSubject.next({ userid: userId, password: '' });
        }

        return response; // Return the response data (e.g., user information)
      }),
      catchError((error) => {
        this.signout(); // Sign out the user if there's an error (e.g., token invalid)
        return of(error); // Return the error
      })
    );
  }

  public signout() {
    localStorage.removeItem('APP_USER_ID');
    localStorage.removeItem('ProfitCenter');
    localStorage.removeItem('companyName');
    localStorage.removeItem('userName');
    localStorage.removeItem('employeeCode');
    localStorage.removeItem('companyId');
    localStorage.removeItem('profitCenterName');
    this.setUserAndToken(null, null, false);
    this.credentialsSubject.next(null); // Emit null to trigger menu reset
    this.router.navigateByUrl('sessions/signin2');
  }

  isLoggedIn(): Boolean {
    return !!this.getJwtToken();
  }

  getJwtToken() {
    return this.ls.getItem(this.JWT_TOKEN);
  }
  getUser() {
    return this.ls.getItem(this.APP_USER);
  }

  setUserAndToken(token: String, user: User, isAuthenticated: Boolean) {
    this.isAuthenticated = isAuthenticated;
    this.token = token;
    this.user = user;
    this.user$.next(user);
    this.ls.setItem(this.JWT_TOKEN, token);
    this.ls.setItem(this.APP_USER, user);
  }
}
