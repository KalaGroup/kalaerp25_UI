import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { BarcodeFormat } from '@zxing/browser';
import { AccountService, InvoiceScanDts } from '../account.service';

@Component({
  selector: 'app-scan-invoice',
  standalone: false,
  templateUrl: './scan-invoice.component.html',
  styleUrls: ['./scan-invoice.component.scss'],
})
export class ScanInvoiceComponent implements AfterViewInit, OnDestroy {

  // ── Camera scanner ──────────────────────────────────────────
  showQrScanner: boolean = false;
  // Widened from QR_CODE-only so the camera can also read the 1D
  // barcodes Rugtek would produce (Code128 / Code39 / EAN / UPC).
  // The physical Rugtek scanner types via HID (see below) so it
  // doesn't depend on this list — this only affects what the
  // on-screen camera can decode.
  allowedFormats = [
    BarcodeFormat.QR_CODE,
    BarcodeFormat.CODE_128,
    BarcodeFormat.CODE_39,
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E,
    BarcodeFormat.ITF,
  ];

  // Camera track constraints — bumped from ngx-scanner's default
  // (usually 640×480) to 1920×1080 so 1D barcodes have enough
  // pixels-per-bar to decode. `facingMode: environment` picks the
  // BACK camera on phones (front camera is useless for scanning
  // documents). `focusMode: continuous` keeps autofocus running so
  // the user doesn't need to tap-to-focus. Browsers ignore fields
  // they don't support, so this is safe on desktop too.
  videoConstraints: MediaTrackConstraints = {
    facingMode: { ideal: 'environment' },
    width:  { ideal: 1920 },
    height: { ideal: 1080 },
    // `focusMode` isn't in the standard TS types yet — cast avoids
    // a compile error on the extension.
    ...({ focusMode: 'continuous' } as any),
  };

  // Turns on ZXing's "tryHarder" decoding hint. It does more
  // decode attempts per frame (~2× CPU) and is the single biggest
  // win for camera-based 1D barcode reads. QR reads are already
  // fast enough that the extra CPU is not noticeable.
  tryHarder: boolean = true;

  // Torch (flashlight) state. Bound to the ngx-scanner's [torch]
  // input. Only functional on devices where the browser exposes
  // MediaStreamTrack ImageCapture torch capability (most modern
  // Android Chrome; iOS Safari doesn't yet).
  torchOn: boolean = false;
  torchAvailable: boolean = false;

  // ── UI state ────────────────────────────────────────────────
  isLoading: boolean = false;
  isSaving: boolean = false;
  invoiceData: InvoiceScanDts | null = null;
  successMessage: string = '';
  errorMessage: string = '';
  warningMessage: string = '';

  // ── HID (Rugtek USB) keyboard-wedge scanner ─────────────────
  // Rugtek reads a barcode/QR and TYPES the value into whichever
  // input is focused, ending with Enter. Two paths cover this:
  //
  //   1. A hidden text input that auto-focuses whenever the scan
  //      section is active — captures Rugtek input as normal
  //      keydown-enter events. Handler: onHidScan().
  //
  //   2. A document-level keydown buffer as a safety net for the
  //      case where focus wandered to a button or the body.
  //      Rugtek types characters ~5-10 ms apart (vs humans at
  //      ~150 ms+), so the buffer's inter-key-gap heuristic
  //      distinguishes scanner input from real typing.
  @ViewChild('hidScannerInput') hidScannerInput?: ElementRef<HTMLInputElement>;

  private readonly HID_MAX_GAP_MS = 80;   // any gap > this resets the buffer
  private readonly HID_MIN_LENGTH = 3;    // shorter than this = ignore (real typing)
  private hidBuffer = '';
  private hidLastKeyTs = 0;

  constructor(private accountService: AccountService) {}

  ngAfterViewInit(): void {
    // Focus the HID input on load so a Rugtek scan works
    // immediately without the operator having to click anything.
    this.focusHidInput();
  }

  ngOnDestroy(): void {
    // Nothing to unwind — HostListener is auto-cleaned by Angular.
  }

  onScanClick(): void {
    this.showQrScanner = !this.showQrScanner;
    this.clearMessages();
    // Keep HID input focused so USB scans still work while the
    // camera is on. The camera doesn't steal keyboard focus.
    this.focusHidInput();
  }

  /**
   * Handler for the hidden HID input's (keydown.enter) — fires
   * once per full Rugtek scan (scanner sends Enter at end of code).
   */
  onHidScan(input: HTMLInputElement): void {
    const code = (input.value ?? '').trim();
    input.value = '';                // clear so next scan starts clean
    this.focusHidInput();            // re-grab focus
    if (!code) return;
    this.handleQrCodeResult(code);
  }

  /**
   * Document-level safety-net for HID scans that landed outside
   * the hidden input (focus wandered). Uses inter-key timing to
   * distinguish scanner burst from human typing. Ignores keys
   * that arrive inside form fields (INPUT / TEXTAREA / editable).
   */
  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(evt: KeyboardEvent): void {
    // TEMP DIAGNOSTIC — logs every keystroke so we can confirm Rugtek
    // is actually reaching the browser. Uses console.log (visible in
    // the default DevTools filter — console.debug is hidden unless
    // 'Verbose' is enabled). Remove once scanning is verified.
    console.log('[RUGTEK keydown]',
      'key=', evt.key,
      'target=', (evt.target as HTMLElement)?.tagName,
      'gap=', Date.now() - this.hidLastKeyTs, 'ms');

    // Skip the dedicated hidden input — it has its own (keydown.enter)
    // binding at the template level; letting BOTH fire on the same
    // Enter would double-dispatch the scan. This mirrors dg-stage-i.
    const target = evt.target as HTMLElement | null;
    if (target?.classList?.contains('hid-scanner-input')) {
      return;
    }

    // Ignore typing inside other real inputs the operator is filling.
    if (
      target &&
      (target.tagName === 'INPUT' ||
       target.tagName === 'TEXTAREA' ||
       target.isContentEditable)
    ) {
      return;
    }

    const now = Date.now();
    const gap = now - this.hidLastKeyTs;
    this.hidLastKeyTs = now;

    if (evt.key === 'Enter') {
      const value = this.hidBuffer.trim();
      this.hidBuffer = '';
      console.log('[RUGTEK] document scan buffered:', value);
      if (value.length >= this.HID_MIN_LENGTH) {
        this.handleQrCodeResult(value);
        evt.preventDefault();
      }
      return;
    }

    if (evt.key.length === 1) {
      if (gap > this.HID_MAX_GAP_MS) this.hidBuffer = '';
      this.hidBuffer += evt.key;
    }
  }

  /**
   * Common entry point for BOTH scan sources (camera + Rugtek).
   * Calls the backend and populates the invoice details panel.
   */
  handleQrCodeResult(result: string): void {
    this.showQrScanner = false;
    this.clearMessages();

    if (!result || result.trim() === '') {
      this.warningMessage = 'Empty code scanned. Please try again.';
      return;
    }

    this.isLoading = true;
    this.invoiceData = null;

    this.accountService.getInvoiceScanDts(result.trim()).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response && response.length > 0) {
          this.invoiceData = response[0];
          this.successMessage = 'Invoice scanned successfully!';
        } else {
          this.warningMessage = 'No invoice data found for the scanned code.';
        }
        this.focusHidInput();
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = 'Failed to fetch invoice details. Please try again.';
        console.error(err);
        this.focusHidInput();
      },
    });
  }

  clearMessages(): void {
    this.successMessage = '';
    this.errorMessage = '';
    this.warningMessage = '';
  }

  /**
   * SAVE handler — POSTs to /api/InvoiceScan/Submit/{INVID}. The
   * backend marks the invoice as GateOut='D' AND fires the dispatch
   * email. Guarded on:
   *   - a scan having actually produced an invoice
   *   - no save currently in flight (prevents double-click double-post)
   * On success we clear the details panel + banner "saved" so the
   * operator immediately sees they're ready for the next scan.
   * On error we keep the details visible so the operator can retry.
   */
  onSaveClick(): void {
    if (!this.canSave()) return;
    this.clearMessages();
    this.isSaving = true;

    const invId = this.invoiceData!.INVID.trim();

    this.accountService.submitInvoiceScan(invId).subscribe({
      next: () => {
        this.isSaving = false;
        this.successMessage = `Invoice ${invId} saved. Dispatch email sent.`;
        this.invoiceData = null;   // clear so next scan starts fresh
        this.focusHidInput();
      },
      error: (err) => {
        this.isSaving = false;
        this.errorMessage =
          err?.error ||
          err?.message ||
          `Failed to save invoice ${invId}. Please try again.`;
        console.error('submitInvoiceScan failed:', err);
        this.focusHidInput();
      },
    });
  }

  /** Enable-guard for the SAVE button + the click handler. */
  canSave(): boolean {
    return !!this.invoiceData
        && !!this.invoiceData.INVID
        && !this.isSaving
        && !this.isLoading;
  }

  /** Flip the torch on/off — bound to the flashlight button in the
   *  camera panel. Silent no-op on devices that don't expose torch. */
  toggleTorch(): void {
    if (!this.torchAvailable) return;
    this.torchOn = !this.torchOn;
  }

  /** ngx-scanner emits this once it has queried the camera for
   *  torch capability. Used to show/hide the flashlight button. */
  onTorchCompatible(compatible: boolean): void {
    this.torchAvailable = compatible;
    if (!compatible) this.torchOn = false;
  }

  /** Put keyboard focus on the hidden HID input so Rugtek scans land here. */
  private focusHidInput(): void {
    // setTimeout so this runs after any pending Angular DOM change (modal
    // dismissal, invoice details render, etc.) that might otherwise steal focus.
    setTimeout(() => this.hidScannerInput?.nativeElement?.focus(), 50);
  }
}
