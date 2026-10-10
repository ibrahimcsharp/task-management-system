import { Directive, ElementRef, AfterViewInit, inject, input } from '@angular/core';

/**
 * Focuses the host element once it is on screen.
 * `requestAnimationFrame` avoids the "element is not focusable" warning that
 * happens when autofocus runs before the browser has laid the node out.
 */
@Directive({
  selector: '[appAutofocus]',
})
export class AutofocusDirective implements AfterViewInit {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly delay = input(0, { alias: 'appAutofocus' });

  ngAfterViewInit(): void {
    const wait = Number(this.delay()) || 0;
    if (wait > 0) {
      setTimeout(() => this.focus(), wait);
      return;
    }
    requestAnimationFrame(() => this.focus());
  }

  private focus(): void {
    const element = this.host.nativeElement;
    if (typeof element.focus === 'function' && !element.hasAttribute('disabled')) {
      element.focus();
      if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
        const length = element.value.length;
        if (length > 0) {
          element.setSelectionRange(length, length);
        }
      }
    }
  }
}
