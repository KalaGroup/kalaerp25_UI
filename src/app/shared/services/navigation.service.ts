import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { JwtAuthService } from './auth/jwt-auth.service';

interface IMenuItem {
  type: 'link' | 'dropDown' | 'icon' | 'separator' | 'extLink';
  name?: string; // Used as display text for item and title for separator type
  state?: string; // Router state
  icon?: string; // Material icon name
  svgIcon?: string; // UI Lib icon name
  tooltip?: string; // Tooltip text
  disabled?: boolean; // If true, item will not be appeared in sidenav.
  sub?: IChildItem[]; // Dropdown items
  badges?: IBadge[];
}
interface IChildItem {
  type?: string;
  name: string; // Display text
  state?: string; // Router state
  icon?: string; // Material icon name
  svgIcon?: string; // UI Lib icon name
  sub?: IChildItem[];
}

interface IBadge {
  color: string; // primary/accent/warn/hex color codes(#fff000)
  value: string; // Display text
}

@Injectable()
export class NavigationService {
  userId: string;
  iconMenu: IMenuItem[] = [
    //  {
    //    type: 'separator',
    //    name: 'Main Items'
    //  },
    // {
    //   name: 'MARKETING',
    //   type: 'dropDown',
    //   tooltip: 'Marketing',
    //   icon: 'assignment',
    //   sub: [{ name: 'MOF NFA Level', state: 'marketing/mof-nfa-level' }],
    // },

    // {
    //   name: 'Marketing',
    //   type: 'dropDown',
    //   tooltip: 'Marketing',
    //   icon: 'campaign',
    //   sub: [
    //     {
    //       name: 'Auth',
    //       type: 'dropDown',
    //       sub: [
    //         { name: 'MOF NFA Level', state: 'marketing/mof-nfa-level' },
    //         // Add more items here if needed in future
    //       ],
    //     },
    //   ],
    // },

    // {
    //   name: 'Logistic',
    //   type: 'dropDown',
    //   tooltip: 'Logistic',
    //   icon: 'local_shipping',
    //   sub: [
    //     {
    //       name: 'Transaction',
    //       type: 'dropDown',
    //       sub: [
    //         { name: 'MTF Scan', state: 'logistic/mtf-scan' },
    //         // Add more items here if needed in future
    //       ],
    //     },
    //   ],
    // },

    //  {
    //   name: 'Kala-Service',
    //   type: 'dropDown',
    //   tooltip: 'kala-service',
    //   icon: 'home_repair_service',
    //   sub: [
    //     {
    //       name: 'Transaction',
    //       type: 'dropDown',
    //       sub: [
    //         { name: 'Service Site Visit', state: 'kala-service/service-site-visit' },
    //         // Add more items here if needed in future
    //       ],
    //     },
    //   ],
    // },

    {
      name: 'DG Assembly Line A',
      type: 'dropDown',
      tooltip: 'DG Assembly Line A',
      icon: 'factory',
      sub: [
        {
          name: 'Transaction',
          type: 'dropDown',
          sub: [
            { name: 'DG Stage-I', state: 'dashboard/dg-stage-I' },
            { name: 'DG Stage-II', state: 'dashboard/dg-stage-II' },
            { name: 'DG Stage-III', state: 'dashboard/dg-stage-III' },
            { name: 'Dg Test Report', state: 'dashboard/dg-test-report' },
            { name: 'DG Packing Slip', state: 'dashboard/dg-packing-slip' },
            {name:'DG Video Upload',state:'dashboard/dg-video-upload'}
          ],
        },
      ],
    },

    // {
    //   name: 'Forms',
    //   type: 'dropDown',
    //   tooltip: 'Forms',
    //   icon: 'assignment',
    //   sub: [
    //         { name: 'Jobcard(Primary-Plan)', state: 'forms/Jobcardprimaryplan' },
    //         // Add more items here if needed in future
    //   ],
    // },

    {
      name: 'Quality',
      type: 'dropDown',
      tooltip: 'Quality',
      icon: 'assignment',
      sub: [
            { name: 'DG Stage I Checker', state: 'quality/dg-stage-i-checker' },
            { name: 'Quality Check List', state: 'quality/dg-quality-master' },
            { name: 'Quality Check List Checker1', state: 'quality/quality-master-checker' },
            {name:'Calibration Master',state:'quality/calibration-master'}
      ],
    },

  ];

  separatorMenu: IMenuItem[] = [
    {
      type: 'separator',
      name: 'CUSTOM COMPONENTS',
    },
    // {
    //   name: 'MARKETING',
    //   type: 'dropDown',
    //   tooltip: 'Marketing',
    //   icon: 'assignment',
    //   sub: [{ name: 'MOF NFA Level', state: 'marketing/mof-nfa-level' }],
    // },
    // {
    //   name: 'Marketing',
    //   type: 'dropDown',
    //   tooltip: 'Marketing',
    //   icon: 'campaign',
    //   sub: [
    //     {
    //       name: 'Auth',
    //       type: 'dropDown',
    //       sub: [
    //         { name: 'MOF NFA Level', state: 'marketing/mof-nfa-level' },
    //         // Add more items here if needed in future
    //       ],
    //     },
    //   ],
    // },

    // {
    //   name: 'Logistic',
    //   type: 'dropDown',
    //   tooltip: 'Logistic',
    //   icon: 'local_shipping',
    //   sub: [
    //     {
    //       name: 'Transaction',
    //       type: 'dropDown',
    //       sub: [
    //         { name: 'MTF Scan', state: 'logistic/mtf-scan' },
    //         // Add more items here if needed in future
    //       ],
    //     },
    //   ],
    // },

    //  {
    //   name: 'Kala-Service',
    //   type: 'dropDown',
    //   tooltip: 'kala-service',
    //   icon: 'home_repair_service',
    //   sub: [
    //     {
    //       name: 'Transaction',
    //       type: 'dropDown',
    //       sub: [
    //         { name: 'Service Site Visit', state: 'kala-service/service-site-visit' },
    //         // Add more items here if needed in future
    //       ],
    //     },
    //   ],
    // },

    // {
    //   name: 'Forms',
    //   type: 'dropDown',
    //   tooltip: 'Forms',
    //   icon: 'assignment',
    //   sub: [
    //         { name: 'Jobcard(Primary-Plan)', state: 'forms/Jobcardprimaryplan' },
    //         // Add more items here if needed in future
    //   ],
    // },

    {
      name: 'Quality',
      type: 'dropDown',
      tooltip: 'Quality',
      icon: 'assignment',
      sub: [
            { name: 'DG Stage I Checker', state: 'quality/dg-stage-i-checker' },
             { name: 'Quality Check List', state: 'quality/dg-quality-master' },
            { name: 'Quality Check List Checker1', state: 'quality/quality-master-checker' },
            {name:'Calibration Master',state:'quality/calibration-master'}
      ],
    },

    {
      type: 'separator',
      name: 'INTEGRATED COMPONENTS',
    },
    {
      name: 'OTHER COMPONENTS',
      type: 'separator',
    },
    // {
    //   name: 'Multi Level',
    //   type: 'dropDown',
    //   tooltip: 'Multi Level',
    //   icon: 'format_align_center',
    //   sub: [
    //     { name: 'Level Two', state: 'fake-4' },
    //     {
    //       name: 'Level Two',
    //       type: 'dropDown',
    //       state: 'fake-1',
    //       sub: [
    //         { name: 'Level Three', state: 'fake-4' },
    //         {
    //           name: 'Level Three',
    //           type: 'dropDown',
    //           state: 'fake-1',

    //         }
    //       ]
    //     },
    //     { name: 'Level Two', state: 'fake-5' }
    //   ]
    // },
    {
      name: 'DG Assembly Line A',
      type: 'dropDown',
      tooltip: 'DG Assembly Line A',
      icon: 'factory',
      sub: [
        {
          name: 'Transaction',
          type: 'dropDown',
          sub: [
            { name: 'DG Stage-I', state: 'dashboard/dg-stage-I' },
            { name: 'DG Stage-II', state: 'dashboard/dg-stage-II' },
            { name: 'DG Stage-III', state: 'dashboard/dg-stage-III' },
            { name: 'Dg Test Report', state: 'dashboard/dg-test-report' },
            { name: 'DG Packing Slip', state: 'dashboard/dg-packing-slip' },
            {name:'DG Video Upload',state:'dashboard/dg-video-upload'}
          ],
        },
      ],
    },
  ];

  plainMenu: IMenuItem[] = [
    // {
    //   name: 'MARKETING',
    //   type: 'dropDown',
    //   tooltip: 'Marketing',
    //   icon: 'assignment',
    //   sub: [{ name: 'MOF NFA Level', state: 'marketing/mof-nfa-level' }],
    // },
    // {
    //   name: 'Marketing',
    //   type: 'dropDown',
    //   tooltip: 'Marketing',
    //   icon: 'campaign',
    //   sub: [
    //     {
    //       name: 'Auth',
    //       type: 'dropDown',
    //       sub: [
    //         { name: 'MOF NFA Level', state: 'marketing/mof-nfa-level' },
    //         // Add more items here if needed in future
    //       ],
    //     },
    //   ],
    // },

    // {
    //   name: 'Logistic',
    //   type: 'dropDown',
    //   tooltip: 'Logistic',
    //   icon: 'local_shipping',
    //   sub: [
    //     {
    //       name: 'Transaction',
    //       type: 'dropDown',
    //       sub: [
    //         { name: 'MTF Scan', state: 'logistic/mtf-scan' },
    //         // Add more items here if needed in future
    //       ],
    //     },
    //   ],
    // },

    //  {
    //   name: 'Kala-Service',
    //   type: 'dropDown',
    //   tooltip: 'kala-service',
    //   icon: 'home_repair_service',
    //   sub: [
    //     {
    //       name: 'Transaction',
    //       type: 'dropDown',
    //       sub: [
    //         { name: 'Service Site Visit', state: 'kala-service/service-site-visit' },
    //         // Add more items here if needed in future
    //       ],
    //     },
    //   ],
    // },


    // },
    // {
    //   name: 'Multi Level',
    //   type: 'dropDown',
    //   tooltip: 'Multi Level',
    //   icon: 'format_align_center',
    //   sub: [
    //     { name: 'Level Two', state: 'fake-4' },
    //     {
    //       name: 'Level Two',
    //       type: 'dropDown',
    //       state: 'fake-1',
    //       sub: [
    //         { name: 'Level Three', state: 'fake-2' },
    //         {
    //           name: 'Level Three',
    //           type: 'dropDown',
    //           state: 'fake-3',
    //           sub: [
    //             { name: 'Level Four', state: 'fake-3' },
    //             {
    //               name: 'Level Four',
    //               type: 'dropDown',
    //               state: 'fake-4',
    //               sub: [
    //                 { name: 'Level Five', state: 'fake-3' },
    //                 { name: 'Level Five', type: 'link' }
    //               ]
    //             }
    //           ]
    //         }
    //       ]
    //     },
    //     { name: 'Level Two', state: 'fake-5' }
    //   ]
    // },
    {
      name: 'DG Assembly Line A',
      type: 'dropDown',
      tooltip: 'DG Assembly Line A',
      icon: 'factory',
      sub: [
        {
          name: 'Transaction',
          type: 'dropDown',
          sub: [
            { name: 'DG Stage-I', state: 'dashboard/dg-stage-I' },
            { name: 'DG Stage-II', state: 'dashboard/dg-stage-II' },
            { name: 'DG Stage-III', state: 'dashboard/dg-stage-III' },
            { name: 'Dg Test Report', state: 'dashboard/dg-test-report' },
            { name: 'DG Packing Slip', state: 'dashboard/dg-packing-slip' },
            {name:'DG Video Upload',state:'dashboard/dg-video-upload'}
          ],
        },
      ],
    },

    // {
    //   name: 'Forms',
    //   type: 'dropDown',
    //   tooltip: 'Forms',
    //   icon: 'assignment',
    //   sub: [
    //         { name: 'Jobcard(Primary-Plan)', state: 'forms/Jobcardprimaryplan' },
    //         // Add more items here if needed in future
    //   ],
    // },

    {
      name: 'Quality',
      type: 'dropDown',
      tooltip: 'Quality',
      icon: 'assignment',
      sub: [
            { name: 'DG Stage I Checker', state: 'quality/dg-stage-i-checker' },
            { name: 'Quality Check List', state: 'quality/dg-quality-master' },
            { name: 'Quality Check List Checker1', state: 'quality/quality-master-checker' },
            {name:'Calibration Master',state:'quality/calibration-master'}
      ],
    },

  ];

  // Icon menu TITLE at the very top of navigation.
  // This title will appear if any icon type item is present in menu.
  iconTypeMenuTitle = 'Frequently Accessed';
  // sets iconMenu as default;
  menuItems = new BehaviorSubject<IMenuItem[]>(this.iconMenu);
  // navigation component has subscribed to this Observable
  menuItems$ = this.menuItems.asObservable();

  // menuNames = new BehaviorSubject<any[]>([]);
  // menuNames$ = this.menuItems.asObservable();

  // constructor(private dashboardService:DashboardService) {
  //       this.fetchAndSetMenu();
  // }

  constructor(private authservice: JwtAuthService) {
    this.authservice.credentials$.subscribe((credentials) => {
      if (credentials) {
        this.userId = credentials.userid;
        console.log('From NavigationService', this.userId);
      }
    });
  }

  // fetchAndSetMenu(): void {
  //   this.dashboardService.getMenu().subscribe(
  //     (menuData: any[]) => {
  //       const dynamicSubItems: IChildItem[] = menuData.map(item => ({
  //         name: item.MenuName,
  //         state: item.Routerlink,
  //         type: 'link'
  //       }));

  //       this.updateDashboardSubItems(this.iconMenu, dynamicSubItems);
  //       this.updateDashboardSubItems(this.separatorMenu, dynamicSubItems);
  //       this.updateDashboardSubItems(this.plainMenu, dynamicSubItems);

  //       this.menuNames.next(this.plainMenu);
  //       console.log('Menu data fetched and set:', this.plainMenu);
  //     },
  //     (error) => {
  //       console.error('Error fetching menu data', error);
  //     }
  //   );
  // }

  // private updateDashboardSubItems(menu: IMenuItem[], dynamicSubItems: IChildItem[]): void {
  //   const dashboardMenu = menu.find(item => item.name === 'DASHBOARD');
  //   if (dashboardMenu) {
  //     dashboardMenu.sub = dynamicSubItems; // Update the sub-items dynamically
  //   }
  // }

  // Customizer component uses this method to change menu.
  // You can remove this method and customizer component.
  // Or you can customize this method to supply different menu for
  // different user type.
  publishNavigationChange(menuType: string) {
    switch (menuType) {
      case 'separator-menu':
        this.menuItems.next(this.separatorMenu);
        break;
      case 'icon-menu':
        this.menuItems.next(this.iconMenu);
        break;
      default:
        this.menuItems.next(this.plainMenu);
    }
  }
}


//Menu load as per new sp



// import { Injectable } from '@angular/core';
// import { BehaviorSubject } from 'rxjs';
// import { HttpClient } from '@angular/common/http';
// import { JwtAuthService } from './auth/jwt-auth.service';
// import { environment } from 'environments/environment';

// interface IMenuItem {
//   type: 'link' | 'dropDown' | 'icon' | 'separator' | 'extLink';
//   name?: string;
//   state?: string;
//   icon?: string;
//   svgIcon?: string;
//   tooltip?: string;
//   disabled?: boolean;
//   sub?: IChildItem[];
//   badges?: IBadge[];
// }

// interface IChildItem {
//   type?: string;
//   name: string;
//   state?: string;
//   icon?: string;
//   svgIcon?: string;
//   sub?: IChildItem[];
// }

// interface IBadge {
//   color: string;
//   value: string;
// }

// // ✅ ADD: New API Response Interface
// interface ApiMenuResponse {
//   Ecode: string;
//   Role_Group: string;
//   FromTypeID: number;
//   FromTypeName: string;
//   ERPType: string;
//   EPDID: number;
//   PageTittle: string;
//   PageURL: string;
//   PageType: number;
//   PageTypeNewERP: number;
//   PageTypeNewERPMenuName: string;
//   DivisionId: number;
//   Division: string;
// }

// @Injectable()
// export class NavigationService {
//   private apiUrl = `${environment.apiURL}UserAuthentication/GetMenu`;
//   private currentUserId: string = null;
//   private menuFetched = false;
//   userId: string;

//   iconMenu: IMenuItem[] = [];
//   separatorMenu: IMenuItem[] = [];
//   plainMenu: IMenuItem[] = [];

//   menuItems = new BehaviorSubject<IMenuItem[]>([]);
//   menuItems$ = this.menuItems.asObservable();
//   iconTypeMenuTitle = 'Frequently Accessed';

//   private formTypeIconMap: Record<string, string> = {
//     M: 'list_alt',
//     P: 'event_note',
//     T: 'swap_horiz',
//     R: 'assessment',
//     A: 'admin_panel_settings',
//     // ✅ ADD: Additional mappings for new menu types
//     Master: 'list_alt',
//     Plan: 'event_note',
//     Transaction: 'swap_horiz',
//     Report: 'assessment',
//     Auth: 'admin_panel_settings',
//   };

//   constructor(private http: HttpClient, private authservice: JwtAuthService) {
//     this.authservice.credentials$.subscribe((credentials) => {
//       if (credentials) {
//         const newUserId = credentials.userid;

//         if (this.currentUserId !== newUserId) {
//           console.log('User changed or new login detected:', newUserId);
//           this.currentUserId = newUserId;
//           this.userId = newUserId;
//           this.menuFetched = false;
//           this.resetMenu();
//           this.fetchDynamicMenus();
//         }
//       } else {
//         console.log('User logged out - resetting menu');
//         this.resetMenu();
//         this.currentUserId = null;
//         this.menuFetched = false;
//       }
//     });

//     this.loadMenuOnRefresh();
//   }

//   private loadMenuOnRefresh(): void {
//     const token = this.authservice.getJwtToken();

//     if (token && !this.menuFetched) {
//       const storedUserId = localStorage.getItem('userId');

//       if (storedUserId) {
//         this.currentUserId = storedUserId;
//         this.userId = storedUserId;
//         this.fetchDynamicMenus();
//       } else {
//         const credentials = this.authservice.getCredentials();
//         if (credentials && credentials.userid) {
//           this.currentUserId = credentials.userid;
//           this.userId = credentials.userid;
//           this.fetchDynamicMenus();
//         }
//       }
//     }
//   }

//   fetchDynamicMenus(): void {
//     if (this.menuFetched) {
//       console.log('Menu already fetched, skipping...');
//       return;
//     }

//     // ✅ UPDATE: Use new API response type
//     this.http.get<ApiMenuResponse[]>(this.apiUrl).subscribe({
//       next: (response: ApiMenuResponse[]) => {
//         if (!response || response.length === 0) {
//           this.plainMenu = [];
//           this.publishNavigationChange('plain-menu');
//           return;
//         }

//         this.menuFetched = true;

//         // ✅ UPDATE: Map new API response to old structure for backward compatibility
//         const mappedResponse = response.map((item) => ({
//           FormType: this.getFormTypeKey(item.PageTypeNewERPMenuName),
//           FormName: item.PageTittle,
//           RoutePath: item.PageURL,
//           PageType: item.PageType,
//           RoleGroup: item.Role_Group,
//           Division: item.Division,
//           EPDID: item.EPDID,
//         }));

//         // ✅ KEEP: Original grouping logic - Group items by FormType
//         const groupedByType = mappedResponse.reduce((acc: any, item: any) => {
//           if (!acc[item.FormType]) acc[item.FormType] = [];
//           acc[item.FormType].push(item);
//           return acc;
//         }, {});

//         // ✅ KEEP: Fixed order for Transaction menu items
//         const fixedOrder: string[] = [
//           'DG Stage-I',
//           'DG Stage-II',
//           'DG Stage-III',
//           'Dg Test Report',
//           'DG Packing Slip',
//         ];

//         // ✅ KEEP: Build submenu function
//         const buildSubMenu = (forms: any[]) =>
//           forms.map((form: any) => ({
//             name: form.FormName,
//             state: form.RoutePath,
//           }));

//         // ✅ KEEP: Form type display mapping
//         const formTypeMap: Record<string, string> = {
//           M: 'Master',
//           P: 'Plan',
//           T: 'Transaction',
//           R: 'Report',
//           A: 'Auth',
//         };

//         // ✅ KEEP: Section order
//         const sectionOrder = ['M', 'P', 'T', 'R', 'A'];

//         const dynamicMenus: IMenuItem[] = [];

//         // ✅ KEEP: Original section building logic
//         sectionOrder.forEach((typeKey) => {
//           const forms = groupedByType[typeKey];

//           if (!forms || forms.length === 0) return;

//           let menuForms = forms;

//           // ✅ KEEP: Special ordering for Transaction section
//           if (typeKey === 'T') {
//             const orderedTransactions = fixedOrder
//               .map((name) => forms.find((f: any) => f.FormName === name))
//               .filter((f): f is any => !!f);

//             const remainingTransactions = forms.filter(
//               (f: any) => !fixedOrder.includes(f.FormName)
//             );

//             menuForms = [...orderedTransactions, ...remainingTransactions];
//           }

//           const sectionName = formTypeMap[typeKey] || typeKey;

//           dynamicMenus.push({
//             name: sectionName,
//             type: 'dropDown',
//             tooltip: sectionName,
//             icon: this.formTypeIconMap[typeKey] || 'folder',
//             sub: buildSubMenu(menuForms),
//           });
//         });

//         console.log('Dynamic Menus:', dynamicMenus);

//         this.plainMenu = dynamicMenus;
//         this.publishNavigationChange('plain-menu');
//       },
//       error: (err) => {
//         console.error('Error fetching menu data:', err);
//         this.menuFetched = false;
//       },
//     });
//   }

//   // ✅ ADD: Helper method to convert PageTypeNewERPMenuName to old FormType key
//   private getFormTypeKey(menuName: string): string {
//     const typeMap: Record<string, string> = {
//       Master: 'M',
//       Plan: 'P',
//       Transaction: 'T',
//       Report: 'R',
//       Auth: 'A',
//       Checker1: 'C1',
//       Checker2: 'C2',
//       Checker3: 'C3',
//       Checker4: 'C4',
//       Checker5: 'C5',
//       CFT: 'CFT',
//       Commom: 'COM', // Note: Database has typo "Commom"
//     };

//     return typeMap[menuName.trim()] || menuName;
//   }

//   resetMenu(): void {
//     console.log('Resetting menu...');
//     this.plainMenu = [];
//     this.iconMenu = [];
//     this.separatorMenu = [];
//     this.menuFetched = false;
//     this.menuItems.next([]);
//   }

//   publishNavigationChange(menuType: string) {
//     switch (menuType) {
//       case 'separator-menu':
//         this.menuItems.next(this.separatorMenu);
//         break;
//       case 'icon-menu':
//         this.menuItems.next(this.iconMenu);
//         break;
//       default:
//         this.menuItems.next(this.plainMenu);
//     }
//   }
// }
