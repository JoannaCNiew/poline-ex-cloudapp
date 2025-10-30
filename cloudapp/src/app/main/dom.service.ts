import { Injectable, ElementRef } from '@angular/core';

@Injectable() 
export class DomService { 

  constructor() { }


  public updateSelectAllCheckboxLabel(
    nativeElement: HTMLElement, 
    translatedText: string
  ): void {
    if (!nativeElement || !translatedText) {
      console.warn('DomService: NativeElement or translatedText not provided.');
      return;
    }

    try {
      const selectEntitiesElement = nativeElement.querySelector('eca-select-entities');
      if (selectEntitiesElement) {
        const selectAllCheckboxLabel = selectEntitiesElement.querySelector('mat-checkbox .mdc-checkbox__label'); 
        const genericLabel = selectEntitiesElement.querySelector('mat-checkbox label'); 
        const labelElement = selectAllCheckboxLabel || genericLabel; 

        if (labelElement) {
          const boldedText = `<b>${translatedText}</b>`;
          if (labelElement.innerHTML !== boldedText) {
            labelElement.innerHTML = boldedText; 
            console.log('DomService: Checkbox label updated.');
          }
        } else {
          console.warn('DomService: Could not find the select all checkbox label element.');
        }
      } else {
        console.warn('DomService: Could not find the eca-select-entities element.');
      }
    } catch (error) {
      console.error('DomService: Error trying to update select all checkbox label:', error);
    }
  }
}
