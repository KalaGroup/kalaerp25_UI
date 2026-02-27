import { Component, OnInit, AfterViewInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { KalaService } from '../kala-service.service';

interface SiteVisit {
  id: number;
  siteName: string;
  siteAddress: string;
  serialNo: string;
  assDate: string;
  workDetails: string;
  lastWorkDt: string | null;
  kva: number;
  ph: number | null;
  model: string;
  panel: string;
  custName: string;
  contactPerson: string;
  contactNo: string;
  pcaCode?: string;
  problemCode?: string;
  problemSubCode?: string;
  ename: string;
}

interface PhotoItem {
  id: number;
  type: 'photo' | 'fsr';
  url: string;
  name: string;
}

@Component({
    selector: 'app-site-visit-details',
    templateUrl: './site-visit-details.component.html',
    styleUrl: './site-visit-details.component.scss',
    standalone: false
})
export class SiteVisitDetailsComponent implements OnInit, AfterViewInit {
  selectedTabIndex: number = 0;
  selectedPhotoType: 'photo' | 'fsr' = 'photo';
  photos: PhotoItem[] = [];
  readonly MAX_PHOTOS = 5;
  signatureData: string = '';

  // Photo Edit View properties
  showPhotoEditView: boolean = false;
  showPhotoSourceSheet: boolean = false;
  capturedPhotoUrl: string = '';
  photoRotation: number = 0;
  showCropGuide: boolean = false;

  // Signature Dialog properties
  showSignatureDialog: boolean = false;
  signatureName: string = '';
  savedSignatureName: string = '';
  hasSignature: boolean = false;
  dialogCanvas: HTMLCanvasElement | null = null;
  dialogCtx: CanvasRenderingContext2D | null = null;

  // VisitWork properties
  workStatus: string = 'work-pending';

  // Customer Feedback properties
  showCustomerFeedback: boolean = false;
  showFeedbackSourceSheet: boolean = false;
  feedbackRatings: { [key: string]: string } = {};
  feedbackFileName: string = 'No file chosen';
  feedbackFileSize: string = '';
  feedbackFile: File | null = null;
  expandedCategories: { [key: string]: boolean } = {};

  //show user friendly messages
  successMessage: string = '';
  errorMessage: string = '';
  warningMessage: string = '';

  currentUser: string = '';
  companyId: string = '';

  // VisitWork properties
  // workStatus: string = '';
  dgHours: string = '';
  noOfStart: string = '';
  workDate: string = '';
  correctiveAction: string = '';
  preventiveAction: string = '';

  // Feedback categories and points
  feedbackCategories = [
    {
      id: 'products',
      label: 'PRODUCTS - Quality, Consistency, Range etc.',
      points: [
        'a) Quality of the products - as per your specifications',
        'b) Consistency of Quality - from lot to lot',
        'c) Product packing and product identification',
        'd) Product Range - to meet all your product requirements',
      ],
    },
    {
      id: 'promptness',
      label: 'PROMPTNESS IN ORDER PROCESSING',
      points: [],
    },
    {
      id: 'technical',
      label: 'TECHNICAL SUPPORT',
      points: [],
    },
    {
      id: 'delivery',
      label: 'DELIVERY',
      points: [],
    },
    {
      id: 'communication',
      label: 'COMMUNICATION',
      points: [],
    },
  ];

  ratings = [
    { value: 'EX', label: 'Excellent', emoji: '😃', displayValue: 'excellent' },
    { value: 'VG', label: 'Very Good', emoji: '😊', displayValue: 'very-good' },
    { value: 'GD', label: 'Good', emoji: '🙂', displayValue: 'good' },
    { value: 'AG', label: 'Average', emoji: '😐', displayValue: 'average' },
    {
      value: 'BG',
      label: 'Below Average',
      emoji: '😞',
      displayValue: 'below-average',
    },
  ];

  // Crop box position and size
  cropBox = {
    x: 50,
    y: 50,
    width: 200,
    height: 200,
  };

  // Drag/Resize state
  isDragging: boolean = false;
  isResizing: boolean = false;
  resizeHandle: string = '';
  dragStartX: number = 0;
  dragStartY: number = 0;
  cropStartX: number = 0;
  cropStartY: number = 0;
  cropStartWidth: number = 0;
  cropStartHeight: number = 0;
  previewBounds = { width: 0, height: 0 };

  // This would come from route params or service
  currentVisit: SiteVisit | null = null;

  tabs = [
    { label: 'Add Photo', icon: 'add_a_photo' },
    { label: 'Signature', icon: 'draw' },
    { label: 'VisitWork', icon: 'engineering' },
    { label: 'Feedback', icon: 'feedback' },
  ];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private kalaService: KalaService
  ) {}

  ngOnInit(): void {
    debugger;
    const employeeCode = localStorage.getItem('employeeCode');
    const companyId = localStorage.getItem('companyId');
    if (employeeCode) {
      this.currentUser = employeeCode;
    }

    if (companyId) {
      console.log('Company ID:', companyId);
      this.companyId = companyId;
    }

    // Get visit data from navigation state
    const navigation = history.state;
    if (navigation && navigation.visit) {
      this.currentVisit = navigation.visit;
      console.log('Current Visit:', this.currentVisit);
    }

    // Or fetch from route params if needed
    const visitId = this.route.snapshot.paramMap.get('id');

    // Initialize feedback ratings
    this.feedbackCategories.forEach((category) => {
      this.feedbackRatings[category.id] = '';
      this.expandedCategories[category.id] = false;
    });

    this.workDate = this.getCurrentDateForInput();
  }

  // Helper method to get date in YYYY-MM-DD format (for input[type="date"])
  private getCurrentDateForInput(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  ngAfterViewInit(): void {
    this.initSignatureCanvas();
  }

  initSignatureCanvas(): void {
    setTimeout(() => {
      const canvas = document.getElementById(
        'signatureCanvas'
      ) as HTMLCanvasElement;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.width = canvas.offsetWidth;
          canvas.height = canvas.offsetHeight;

          // Restore saved signature if exists
          if (this.signatureData) {
            const img = new Image();
            img.onload = () => {
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            };
            img.src = this.signatureData;
          }

          let isDrawing = false;
          let lastX = 0;
          let lastY = 0;

          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 2;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          const startDrawing = (e: MouseEvent | TouchEvent) => {
            isDrawing = true;
            const rect = canvas.getBoundingClientRect();
            const x =
              e instanceof MouseEvent
                ? e.clientX - rect.left
                : e.touches[0].clientX - rect.left;
            const y =
              e instanceof MouseEvent
                ? e.clientY - rect.top
                : e.touches[0].clientY - rect.top;
            lastX = x;
            lastY = y;
          };

          const draw = (e: MouseEvent | TouchEvent) => {
            if (!isDrawing) return;
            e.preventDefault();

            const rect = canvas.getBoundingClientRect();
            const x =
              e instanceof MouseEvent
                ? e.clientX - rect.left
                : e.touches[0].clientX - rect.left;
            const y =
              e instanceof MouseEvent
                ? e.clientY - rect.top
                : e.touches[0].clientY - rect.top;

            ctx.beginPath();
            ctx.moveTo(lastX, lastY);
            ctx.lineTo(x, y);
            ctx.stroke();

            lastX = x;
            lastY = y;
          };

          const stopDrawing = () => {
            isDrawing = false;
          };

          canvas.addEventListener('mousedown', startDrawing);
          canvas.addEventListener('mousemove', draw);
          canvas.addEventListener('mouseup', stopDrawing);
          canvas.addEventListener('mouseout', stopDrawing);

          canvas.addEventListener('touchstart', startDrawing);
          canvas.addEventListener('touchmove', draw);
          canvas.addEventListener('touchend', stopDrawing);
        }
      }
    }, 500);
  }

  restoreSignatureCanvas(): void {
    const canvas = document.getElementById(
      'signatureCanvas'
    ) as HTMLCanvasElement;
    if (canvas && this.signatureData) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;

        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        };
        img.src = this.signatureData;
      }
    }
  }

  goBack(): void {
    this.router.navigate(['/kala-service/service-site-visit']);
  }

  onSave(): void {
    debugger;
    this.clearMessages();

    const validationErrors: string[] = [];

    // 1. Check if signature is captured
    if (!this.signatureData || this.signatureData.trim() === '') {
      validationErrors.push('Please get the Sign');
    }

    // 2. Check DG Hours
    if (!this.dgHours || this.dgHours === '') {
      validationErrors.push('Please Enter DG Hours');
    }

    // 3. Check No Of Start
    if (!this.noOfStart || this.noOfStart === '') {
      validationErrors.push('Please Enter No Of Start');
    }

    // 4. Check Work Date
    // if (!this.workDate || this.workDate.trim() === '') {
    //   validationErrors.push('Please Select Work Date');
    // }

    // 5. Check Work Status
    if (!this.workStatus || this.workStatus.trim() === '') {
      validationErrors.push('Please Select Work Status');
    }

    // 6. Check Corrective Action
    if (!this.correctiveAction || this.correctiveAction.trim() === '') {
      validationErrors.push('Please Enter Corrective Action');
    }

    // 7. Check Preventive Action
    if (!this.preventiveAction || this.preventiveAction.trim() === '') {
      validationErrors.push('Please Enter Preventive Action');
    }

    // If there are validation errors, show them
    if (validationErrors.length > 0) {
      this.warningMessage = validationErrors.join(', ');
      return;
    }

    // Prepare FormData
    const formData = this.prepareSiteVisitData();
    formData.forEach((value, key) => {
      console.log(`${key}:`, value);
    });

    this.kalaService.submitSiteVisitDetails(formData).subscribe({
      next: (response) => {
        // ✅ Check for business logic errors returned as success
        const responseStr =
          typeof response === 'string' ? response : JSON.stringify(response);

        if (
          responseStr.includes('Customer Feedback Pending') ||
          responseStr.includes('Pending') ||
          responseStr === 'Customer Feedback Pending'
        ) {
          this.errorMessage =
            'Customer Feedback Pending, please submit feedback first.';
          this.successMessage = '';
          return;
        }
        // this.successMessage = 'Site visit details saved successfully!';
        this.successMessage = `Site visit details saved successfully: ${response}`;
         // ✅ CHANGE: Navigate back to service-site-visit
         setTimeout(() => {
        this.router.navigate(['/kala-service/service-site-visit'], {
          state: { refresh: true }
        });
      }, 5000);
      },
      error: (error) => {
        this.errorMessage = 'Failed to save site visit details.';
      },
    });
  }

  // Helper method to prepare FormData
  // Helper method to prepare FormData
  private prepareSiteVisitData(): FormData {
    const formData = new FormData();

    // Basic info from localStorage and currentVisit
    formData.append('comp_code', this.companyId || '');
    formData.append('user_code', this.currentUser || '');
    formData.append('pca_code', this.currentVisit?.pcaCode || '');
    formData.append('eng_sr_no', this.currentVisit?.serialNo || '');

    // Work details from form
    formData.append('dg_hour', this.dgHours || '');
    formData.append('no_of_start', this.noOfStart || '');
    formData.append('work_date', this.workDate || '');
    //formData.append('action_status', this.workStatus || '');
    formData.append(
      'action_status',
      this.workStatus === 'Work Done' ? 'F' : 'P'
    );

    // Problem codes from currentVisit
    formData.append('problem_code', this.currentVisit?.problemCode || '');
    formData.append(
      'problem_sub_code',
      this.currentVisit?.problemSubCode || ''
    );

    // Actions from textareas
    formData.append('corrective_action', this.correctiveAction || '');
    formData.append('preventive_action', this.preventiveAction || '');

    // Signature
    formData.append('sign', this.signatureData || '');
    formData.append('name', this.savedSignatureName || '');

    // ✅ Photos - Add each photo
    this.photos.forEach((photo, index) => {
      const photoBlob = this.dataURLtoBlob(photo.url);
      formData.append('photos', photoBlob, photo.name);
    });

    // ✅ File types - Add as array (multiple values with same key)
    this.photos.forEach((photo) => {
      formData.append('file_types', photo.type); // 'photo' or 'fsr'
    });

    // Add total photo count
    formData.append('photo_count', this.photos.length.toString());

    return formData;
  }

  // Helper method to convert base64 to Blob
  private dataURLtoBlob(dataURL: string): Blob {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)![1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  }

  onTabChange(index: number): void {
    // Save current signature before tab change
    if (this.selectedTabIndex === 1) {
      // Signature tab index
      const canvas = document.getElementById(
        'signatureCanvas'
      ) as HTMLCanvasElement;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const hasDrawing = imageData.data.some((channel) => channel !== 0);
          if (hasDrawing) {
            this.signatureData = canvas.toDataURL('image/png');
          }
        }
      }
    }

    this.selectedTabIndex = index;

    // Restore signature when switching to signature tab
    if (index === 1) {
      // Signature tab index
      setTimeout(() => {
        this.restoreSignatureCanvas();
      }, 100);
    }
  }

  onPhotoTypeChange(type: 'photo' | 'fsr'): void {
    this.selectedPhotoType = type;
  }

  getCurrentDate(): string {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    return `${day}-${month}-${year}`;
  }

  // Open full screen photo edit view
  openPhotoEditView(): void {
    this.showPhotoEditView = true;
    this.showPhotoSourceSheet = true;
    this.capturedPhotoUrl = '';
    this.photoRotation = 0;
    this.showCropGuide = false;
  }

  // Close photo edit view
  closePhotoEditView(): void {
    this.showPhotoEditView = false;
    this.showPhotoSourceSheet = false;
    this.capturedPhotoUrl = '';
    this.photoRotation = 0;
    this.showCropGuide = false;
  }

  // Rotate photo by 90 degrees
  rotatePhoto(): void {
    this.photoRotation = (this.photoRotation + 90) % 360;
  }

  // Toggle crop guide overlay
  toggleCropGuide(): void {
    this.showCropGuide = !this.showCropGuide;
  }

  // Crop and save photo
  // cropPhoto(): void {
  //   if (this.capturedPhotoUrl) {
  //     // Create canvas to apply rotation and crop
  //     const canvas = document.createElement('canvas');
  //     const ctx = canvas.getContext('2d');
  //     const img = new Image();

  //     img.onload = () => {
  //       // Calculate rotated dimensions
  //       const isRotated90or270 =
  //         this.photoRotation === 90 || this.photoRotation === 270;
  //       canvas.width = isRotated90or270 ? img.height : img.width;
  //       canvas.height = isRotated90or270 ? img.width : img.height;

  //       // Apply rotation
  //       ctx!.save();
  //       ctx!.translate(canvas.width / 2, canvas.height / 2);
  //       ctx!.rotate((this.photoRotation * Math.PI) / 180);
  //       ctx!.drawImage(img, -img.width / 2, -img.height / 2);
  //       ctx!.restore();

  //       // Get rotated image as base64
  //       const rotatedImageUrl = canvas.toDataURL('image/jpeg', 0.9);

  //       // Add photo to list with rotation applied
  //       const newPhoto: PhotoItem = {
  //         id: Date.now(),
  //         type: this.selectedPhotoType,
  //         url: rotatedImageUrl,
  //         name: `photo_${Date.now()}.jpg`,
  //       };
  //       this.photos.push(newPhoto);

  //       // Close edit view
  //       this.closePhotoEditView();
  //     };

  //     img.src = this.capturedPhotoUrl;
  //   } else {
  //     alert('Please select a photo first');
  //   }
  // }

  cropPhoto(): void {
    debugger;
    if (this.capturedPhotoUrl) {
      // Check photo limit
      if (this.getFilteredPhotos().length >= this.MAX_PHOTOS) {
        this.warningMessage = `You Can Add Maximum ${this.MAX_PHOTOS} Photo`;
        return;
      }

      // Create canvas to apply rotation and crop
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate rotated dimensions
        const isRotated90or270 =
          this.photoRotation === 90 || this.photoRotation === 270;
        canvas.width = isRotated90or270 ? img.height : img.width;
        canvas.height = isRotated90or270 ? img.width : img.height;

        // Apply rotation
        ctx!.save();
        ctx!.translate(canvas.width / 2, canvas.height / 2);
        ctx!.rotate((this.photoRotation * Math.PI) / 180);
        ctx!.drawImage(img, -img.width / 2, -img.height / 2);
        ctx!.restore();

        // Get rotated image as base64
        const rotatedImageUrl = canvas.toDataURL('image/jpeg', 0.9);

        // Add photo to list with rotation applied
        const newPhoto: PhotoItem = {
          id: Date.now(),
          type: this.selectedPhotoType,
          url: rotatedImageUrl,
          name: `photo_${Date.now()}.jpg`,
        };
        this.photos.push(newPhoto);

        // Close edit view
        this.closePhotoEditView();
      };

      img.src = this.capturedPhotoUrl;
    } else {
      this.warningMessage = 'Please select a photo first';
    }
  }

  // Handle photo source selection
  selectPhotoSource(source: 'camera' | 'media' | 'gallery'): void {
    this.showPhotoSourceSheet = false;

    let inputId: string;

    switch (source) {
      case 'camera':
        inputId = 'cameraInput';
        break;
      case 'media':
        inputId = 'mediaInput';
        break;
      case 'gallery':
        inputId = 'galleryInput';
        break;
      default:
        inputId = 'galleryInput';
    }

    const fileInput = document.getElementById(inputId) as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const reader = new FileReader();

      reader.onload = (e) => {
        this.capturedPhotoUrl = e.target?.result as string;
        this.photoRotation = 0;
        this.showCropGuide = true;

        // Initialize crop box after image loads
        setTimeout(() => {
          this.initCropBox();
        }, 100);
      };

      reader.readAsDataURL(file);
      input.value = '';
    }
  }

  removePhoto(photoId: number): void {
    this.photos = this.photos.filter((p) => p.id !== photoId);
  }

  getFilteredPhotos(): PhotoItem[] {
    return this.photos.filter((p) => p.type === this.selectedPhotoType);
  }

  clearSignature(): void {
    this.signatureData = '';
    const canvas = document.getElementById(
      'signatureCanvas'
    ) as HTMLCanvasElement;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }

  captureSignature(): void {
    const canvas = document.getElementById(
      'signatureCanvas'
    ) as HTMLCanvasElement;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Check if canvas has any drawing
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const hasDrawing = imageData.data.some((channel) => channel !== 0);

        if (hasDrawing) {
          this.signatureData = canvas.toDataURL('image/png');
          alert('Signature captured successfully!');
        } else {
          alert('Please sign before capturing');
        }
      }
    }
  }

  // Crop box drag methods
  onCropMouseDown(event: MouseEvent | TouchEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
    this.isResizing = false;

    const clientX =
      event instanceof MouseEvent ? event.clientX : event.touches[0].clientX;
    const clientY =
      event instanceof MouseEvent ? event.clientY : event.touches[0].clientY;

    this.dragStartX = clientX;
    this.dragStartY = clientY;
    this.cropStartX = this.cropBox.x;
    this.cropStartY = this.cropBox.y;

    this.updatePreviewBounds();
  }

  onResizeMouseDown(event: MouseEvent | TouchEvent, handle: string): void {
    event.preventDefault();
    event.stopPropagation();
    this.isResizing = true;
    this.isDragging = false;
    this.resizeHandle = handle;

    const clientX =
      event instanceof MouseEvent ? event.clientX : event.touches[0].clientX;
    const clientY =
      event instanceof MouseEvent ? event.clientY : event.touches[0].clientY;

    this.dragStartX = clientX;
    this.dragStartY = clientY;
    this.cropStartX = this.cropBox.x;
    this.cropStartY = this.cropBox.y;
    this.cropStartWidth = this.cropBox.width;
    this.cropStartHeight = this.cropBox.height;

    this.updatePreviewBounds();
  }

  onCropMouseMove(event: MouseEvent | TouchEvent): void {
    if (!this.isDragging && !this.isResizing) return;
    event.preventDefault();

    const clientX =
      event instanceof MouseEvent ? event.clientX : event.touches[0].clientX;
    const clientY =
      event instanceof MouseEvent ? event.clientY : event.touches[0].clientY;

    const deltaX = clientX - this.dragStartX;
    const deltaY = clientY - this.dragStartY;

    if (this.isDragging) {
      // Move crop box with boundary constraints
      let newX = this.cropStartX + deltaX;
      let newY = this.cropStartY + deltaY;

      // Constrain within preview bounds
      newX = Math.max(
        0,
        Math.min(newX, this.previewBounds.width - this.cropBox.width)
      );
      newY = Math.max(
        0,
        Math.min(newY, this.previewBounds.height - this.cropBox.height)
      );

      this.cropBox.x = newX;
      this.cropBox.y = newY;
    } else if (this.isResizing) {
      this.handleResize(deltaX, deltaY);
    }
  }

  handleResize(deltaX: number, deltaY: number): void {
    const minSize = 50;

    switch (this.resizeHandle) {
      case 'top-left':
        this.cropBox.x = Math.max(
          0,
          Math.min(
            this.cropStartX + deltaX,
            this.cropStartX + this.cropStartWidth - minSize
          )
        );
        this.cropBox.y = Math.max(
          0,
          Math.min(
            this.cropStartY + deltaY,
            this.cropStartY + this.cropStartHeight - minSize
          )
        );
        this.cropBox.width =
          this.cropStartWidth - (this.cropBox.x - this.cropStartX);
        this.cropBox.height =
          this.cropStartHeight - (this.cropBox.y - this.cropStartY);
        break;
      case 'top-right':
        this.cropBox.y = Math.max(
          0,
          Math.min(
            this.cropStartY + deltaY,
            this.cropStartY + this.cropStartHeight - minSize
          )
        );
        this.cropBox.width = Math.max(
          minSize,
          Math.min(
            this.cropStartWidth + deltaX,
            this.previewBounds.width - this.cropBox.x
          )
        );
        this.cropBox.height =
          this.cropStartHeight - (this.cropBox.y - this.cropStartY);
        break;
      case 'bottom-left':
        this.cropBox.x = Math.max(
          0,
          Math.min(
            this.cropStartX + deltaX,
            this.cropStartX + this.cropStartWidth - minSize
          )
        );
        this.cropBox.width =
          this.cropStartWidth - (this.cropBox.x - this.cropStartX);
        this.cropBox.height = Math.max(
          minSize,
          Math.min(
            this.cropStartHeight + deltaY,
            this.previewBounds.height - this.cropBox.y
          )
        );
        break;
      case 'bottom-right':
        this.cropBox.width = Math.max(
          minSize,
          Math.min(
            this.cropStartWidth + deltaX,
            this.previewBounds.width - this.cropBox.x
          )
        );
        this.cropBox.height = Math.max(
          minSize,
          Math.min(
            this.cropStartHeight + deltaY,
            this.previewBounds.height - this.cropBox.y
          )
        );
        break;
    }
  }

  onCropMouseUp(): void {
    this.isDragging = false;
    this.isResizing = false;
    this.resizeHandle = '';
  }

  updatePreviewBounds(): void {
    const previewEl = document.querySelector(
      '.photo-edit-preview'
    ) as HTMLElement;
    if (previewEl) {
      this.previewBounds.width = previewEl.clientWidth;
      this.previewBounds.height = previewEl.clientHeight;
    }
  }

  initCropBox(): void {
    this.updatePreviewBounds();
    // Center crop box and set initial size
    const size =
      Math.min(this.previewBounds.width, this.previewBounds.height) * 0.7;
    this.cropBox.width = size;
    this.cropBox.height = size;
    this.cropBox.x = (this.previewBounds.width - size) / 2;
    this.cropBox.y = (this.previewBounds.height - size) / 2;
  }

  // Signature Dialog methods
  openSignatureDialog(): void {
    this.showSignatureDialog = true;
    this.signatureName = '';
    this.hasSignature = false;

    setTimeout(() => {
      this.initDialogSignatureCanvas();
    }, 100);
  }

  closeSignatureDialog(): void {
    this.showSignatureDialog = false;
    this.signatureName = '';
  }

  clearDialogSignature(): void {
    if (this.dialogCtx && this.dialogCanvas) {
      this.dialogCtx.clearRect(
        0,
        0,
        this.dialogCanvas.width,
        this.dialogCanvas.height
      );
      this.hasSignature = false;
    }
  }

  saveSignature(): void {
    if (this.dialogCanvas && this.signatureName.trim()) {
      // Check if signature is drawn
      const ctx = this.dialogCanvas.getContext('2d');
      if (ctx) {
        const imageData = ctx.getImageData(
          0,
          0,
          this.dialogCanvas.width,
          this.dialogCanvas.height
        );
        const hasDrawing = imageData.data.some((channel) => channel !== 0);

        if (hasDrawing) {
          this.signatureData = this.dialogCanvas.toDataURL('image/png');
          this.savedSignatureName = this.signatureName; // Save the name

          // Copy to main canvas
          const mainCanvas = document.getElementById(
            'signatureCanvas'
          ) as HTMLCanvasElement;
          if (mainCanvas) {
            const mainCtx = mainCanvas.getContext('2d');
            if (mainCtx) {
              mainCtx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
              const img = new Image();
              img.onload = () => {
                mainCtx.drawImage(
                  img,
                  0,
                  0,
                  mainCanvas.width,
                  mainCanvas.height
                );
              };
              img.src = this.signatureData;
            }
          }

          this.closeSignatureDialog();
        } else {
          alert('Please sign before saving');
        }
      }
    } else {
      alert('Please enter name and signature');
    }
  }

  isSignatureValid(): boolean {
    return this.signatureName.trim().length > 0 && this.hasSignature;
  }

  onSignatureNameChange(): void {
    // Trigger change detection for button state
  }

  initDialogSignatureCanvas(): void {
    this.dialogCanvas = document.getElementById(
      'dialogSignatureCanvas'
    ) as HTMLCanvasElement;
    if (this.dialogCanvas) {
      this.dialogCtx = this.dialogCanvas.getContext('2d');
      if (this.dialogCtx) {
        this.dialogCanvas.width = this.dialogCanvas.offsetWidth;
        this.dialogCanvas.height = this.dialogCanvas.offsetHeight;

        let isDrawing = false;
        let lastX = 0;
        let lastY = 0;

        this.dialogCtx.strokeStyle = '#000000';
        this.dialogCtx.lineWidth = 2;
        this.dialogCtx.lineCap = 'round';
        this.dialogCtx.lineJoin = 'round';

        const startDrawing = (e: MouseEvent | TouchEvent) => {
          isDrawing = true;
          const rect = this.dialogCanvas!.getBoundingClientRect();
          const x =
            e instanceof MouseEvent
              ? e.clientX - rect.left
              : e.touches[0].clientX - rect.left;
          const y =
            e instanceof MouseEvent
              ? e.clientY - rect.top
              : e.touches[0].clientY - rect.top;
          lastX = x;
          lastY = y;
        };

        const draw = (e: MouseEvent | TouchEvent) => {
          if (!isDrawing) return;
          e.preventDefault();

          const rect = this.dialogCanvas!.getBoundingClientRect();
          const x =
            e instanceof MouseEvent
              ? e.clientX - rect.left
              : e.touches[0].clientX - rect.left;
          const y =
            e instanceof MouseEvent
              ? e.clientY - rect.top
              : e.touches[0].clientY - rect.top;

          this.dialogCtx!.beginPath();
          this.dialogCtx!.moveTo(lastX, lastY);
          this.dialogCtx!.lineTo(x, y);
          this.dialogCtx!.stroke();

          lastX = x;
          lastY = y;

          // Mark that signature has been drawn
          this.hasSignature = true;
        };

        const stopDrawing = () => {
          isDrawing = false;
        };

        this.dialogCanvas.addEventListener('mousedown', startDrawing);
        this.dialogCanvas.addEventListener('mousemove', draw);
        this.dialogCanvas.addEventListener('mouseup', stopDrawing);
        this.dialogCanvas.addEventListener('mouseout', stopDrawing);

        this.dialogCanvas.addEventListener('touchstart', startDrawing);
        this.dialogCanvas.addEventListener('touchmove', draw);
        this.dialogCanvas.addEventListener('touchend', stopDrawing);
      }
    }
  }

  // Customer Feedback methods
  openCustomerFeedback(): void {
    this.showCustomerFeedback = true;
  }

  closeCustomerFeedback(): void {
    this.showCustomerFeedback = false;
  }

  toggleCategory(categoryId: string): void {
    // If clicking on an already expanded category, just collapse it
    if (this.expandedCategories[categoryId]) {
      this.expandedCategories[categoryId] = false;
    } else {
      // Close all other categories
      Object.keys(this.expandedCategories).forEach((key) => {
        this.expandedCategories[key] = false;
      });
      // Open the clicked category
      this.expandedCategories[categoryId] = true;
    }
  }

  onFeedbackFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const fileName = file.name;

      // Extract file extension
      const lastDotIndex = fileName.lastIndexOf('.');
      const fileExtension =
        lastDotIndex !== -1
          ? fileName.substring(lastDotIndex).toLowerCase()
          : '';

      // Allowed extensions
      const allowedExtensions = [
        '.3gp',
        '.jpg',
        '.jpeg',
        '.pdf',
        '.wmv',
        '.flv',
        '.mp4',
        '.avi',
        '.mpg',
        '.wav',
        '.mpeg',
        '.png',
      ];

      // Validate file extension
      if (!allowedExtensions.includes(fileExtension)) {
        this.warningMessage = `Invalid file format. Allowed formats: ${allowedExtensions.join(
          ', '
        )}`;
        this.feedbackFile = null;
        this.feedbackFileName = 'No file chosen';
        this.feedbackFileSize = '';
        input.value = ''; // Clear the input
        return;
      }

      // Optional: Add file size validation (e.g., max 10MB)
      const maxSizeInMB = 100;
      const fileSizeInMB = file.size / (1024 * 1024);

      if (fileSizeInMB > maxSizeInMB) {
        this.warningMessage = `File size exceeds ${maxSizeInMB}MB. Please select a smaller file.`;
        this.feedbackFile = null;
        this.feedbackFileName = 'No file chosen';
        this.feedbackFileSize = '';
        input.value = ''; // Clear the input
        return;
      }

      // Clear any previous warnings
      this.clearMessages();

      // File is valid, proceed
      this.feedbackFile = file;
      this.feedbackFileName = file.name;

      // Calculate file size
      this.feedbackFileSize = fileSizeInMB.toFixed(2) + ' MB';
    } else {
      this.feedbackFile = null;
      this.feedbackFileName = 'No file chosen';
      this.feedbackFileSize = '';
    }
  }

  openFeedbackSourceSheet(): void {
    this.showFeedbackSourceSheet = true;
  }

  closeFeedbackSourceSheet(): void {
    this.clearMessages();
    this.showFeedbackSourceSheet = false;
  }

  selectFeedbackSource(source: 'media' | 'gallery'): void {
    this.showFeedbackSourceSheet = false;

    const inputId =
      source === 'media' ? 'feedbackMediaInput' : 'feedbackGalleryInput';

    const fileInput = document.getElementById(inputId) as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  saveFeedback(): void {
    debugger;
    this.clearMessages();

    // Validate that all ratings are selected
    const allRated = this.feedbackCategories.every(
      (category) => this.feedbackRatings[category.id] !== ''
    );

    if (!allRated) {
      // Find unrated categories
      const unratedCategories = this.feedbackCategories.filter(
        (category) =>
          !this.feedbackRatings[category.id] ||
          this.feedbackRatings[category.id] === ''
      );

      const categoryNames = unratedCategories
        .map((c) => c.label.split('-')[0].trim())
        .join(', ');
      this.warningMessage = `Please rate the following categories: ${categoryNames}`;
      return;
    }

    // Validate file is attached (if required)
    if (!this.feedbackFile) {
      this.warningMessage = 'Please attach a media file';
      return;
    }

    // Prepare FormData
    const formData = new FormData();
    formData.append('products', this.feedbackRatings['products'] || '');
    formData.append('promptness', this.feedbackRatings['promptness'] || '');
    formData.append('technical', this.feedbackRatings['technical'] || '');
    formData.append('delivery', this.feedbackRatings['delivery'] || '');
    formData.append(
      'communication',
      this.feedbackRatings['communication'] || ''
    );
    formData.append('file', this.feedbackFile, this.feedbackFile.name);
    formData.append('ecode', this.currentUser || '');
    formData.append('actno', this.currentVisit?.pcaCode || '');
    formData.append('engno', this.currentVisit?.serialNo || '');
    formData.append('companyId', this.companyId || '');
    console.log('Feedback Data:', formData);

    // Call the service
    this.kalaService.submitCustomerFeedback(formData).subscribe({
      next: (response) => {
        console.log('Feedback submitted successfully:', response);
        this.successMessage = `Feedback saved successfully with: ${response}`;
      },
      error: (error) => {
        console.error('Error submitting feedback:', error);
        this.errorMessage = 'Failed to save feedback. Please try again.';
      },
    });

    // setTimeout(() => {
    //   this.clearMessages();
    //   this.closeCustomerFeedback();
    // }, 4000);
    //this.closeCustomerFeedback();
  }

  clearMessages() {
    this.errorMessage = '';
    this.successMessage = '';
    this.warningMessage = '';
  }
}
