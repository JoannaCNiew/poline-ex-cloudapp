import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormGroup, FormArray, FormControl } from '@angular/forms';
import { CloudAppConfigService, AlertService } from '@exlibris/exl-cloudapp-angular-lib';
import { AVAILABLE_FIELDS } from '../main/field-definitions'; 
import { Router } from '@angular/router';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { AppSettings, FieldConfig } from '../models/settings';
import { Subscription } from 'rxjs'; 

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'] // Zostawiamy SCSS na koniec
})
export class SettingsComponent implements OnInit, OnDestroy {

  settings: AppSettings = { availableFields: [] };
  form!: FormGroup;
  saving = false;
  
  // Właściwości dla Drag and Drop
  expandedIndex: number | null = null;
  hoverIndex: number | null = null;
  
  private configSubscription: Subscription | undefined; // <--- NAPRAWA BŁĘDU TS2564: Używamy ' | undefined'

  // Właściwość pomocnicza do łatwego dostępu do FormArray
  get fieldsFormArray(): FormArray {
    return this.form.get('availableFields') as FormArray;
  }

  constructor(
    private configService: CloudAppConfigService,
    private alert: AlertService,
    public router: Router, // Musimy wstrzyknąć Router, aby nawigować
  ) {
    this.form = new FormGroup({
      availableFields: new FormArray([])
    });
  }

  ngOnInit() {
    // Wczytywanie konfiguracji z Alma
    this.configSubscription = this.configService.get().subscribe({
      next: (settings: any) => {
        // Jeśli ustawienia nie istnieją, używamy domyślnej listy pól
        this.settings = settings && settings.availableFields ? settings : { availableFields: [...AVAILABLE_FIELDS] };
        this.initForm();
      },
      error: (err: any) => this.alert.error('Nie udało się wczytać ustawień: ' + err.message)
    });
  }

  ngOnDestroy(): void {
    // Ważne: usuwamy subskrypcję, aby uniknąć wycieków pamięci
    if (this.configSubscription) {
        this.configSubscription.unsubscribe();
    }
  }

  initForm() {
    this.settings.availableFields.forEach(field => {
      // Inicjalizacja każdego pola jako FormGroup w FormArray
      this.fieldsFormArray.push(new FormGroup({
        name: new FormControl(field.name),
        label: new FormControl(field.label),
        selected: new FormControl(field.selected),
        customLabel: new FormControl(field.customLabel)
      }));
    });
  }
  
  toggleExpand(index: number) {
    this.expandedIndex = this.expandedIndex === index ? null : index;
  }

  // Metoda obsługująca zmianę kolejności za pomocą Drag and Drop
  drop(event: CdkDragDrop<FormGroup[]>) {
    moveItemInArray(this.fieldsFormArray.controls, event.previousIndex, event.currentIndex);
    this.form.markAsDirty(); // Oznaczamy formularz jako zmieniony po przestawieniu
  }

  // Metoda zapisu (zgodna z nazwą w HTML inspirującym: saveSettings)
  saveSettings() {
    if (this.saving) return; // Zmieniamy 'isSaving' na 'saving'
    this.saving = true;
    
    // Filtrujemy tylko wartości z FormArray
    const fieldsToSave: FieldConfig[] = this.fieldsFormArray.controls.map(control => control.value);
    
    this.configService.set({ availableFields: fieldsToSave } as AppSettings).subscribe({
      next: () => {
        this.saving = false;
        this.alert.success('Ustawienia zostały zapisane!');
        this.router.navigate(['/']); // Nawigacja do strony głównej
      },
      error: (err: any) => {
        this.saving = false;
        this.alert.error('Nie udało się zapisać ustawień: ' + err.message);
      }
    });
  }

  // Metoda anulowania (zgodna z nazwą w HTML inspirującym: onCancel)
  onCancel(): void {
      this.router.navigate(['/']); 
  }
}
