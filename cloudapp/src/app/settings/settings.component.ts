import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormGroup, FormArray, FormControl } from '@angular/forms';
import { CloudAppSettingsService, AlertService } from '@exlibris/exl-cloudapp-angular-lib';
import { AVAILABLE_FIELDS } from '../main/field-definitions'; 
import { Router } from '@angular/router';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { AppSettings, FieldConfig } from '../models/settings';
import { Subscription } from 'rxjs'; 
import { MatCheckboxChange } from '@angular/material/checkbox';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit, OnDestroy {

  settings: AppSettings = { availableFields: [] };
  form!: FormGroup;
  saving = false;
  
  expandedIndex: number | null = null;
  hoverIndex: number | null = null;
  
  private configSubscription: Subscription | undefined;

  get fieldsFormArray(): FormArray {
    return this.form.get('availableFields') as FormArray;
  }

  get selectedFieldsCount(): number {
    if (!this.form) return 0;
    return this.fieldsFormArray.controls.filter(control => control.value.selected).length;
  }

  // NOWA WŁAŚCIWOŚĆ: Sprawdza, czy wszystkie pola są zaznaczone
  get allFieldsSelected(): boolean {
    return this.fieldsFormArray.length > 0 && this.selectedFieldsCount === this.fieldsFormArray.length;
  }

  // NOWA WŁAŚCIWOŚĆ: Sprawdza, czy zaznaczone są niektóre (ale nie wszystkie) pola
  get someFieldsSelected(): boolean {
    return this.selectedFieldsCount > 0 && !this.allFieldsSelected;
  }

  constructor(
    private settingsService: CloudAppSettingsService,
    private alert: AlertService,
    public router: Router, 
  ) {
    this.form = new FormGroup({
      availableFields: new FormArray([])
    });
  }

  ngOnInit() {
    this.configSubscription = this.settingsService.get().subscribe({
      next: (settings: any) => {
        this.settings = settings && settings.availableFields ? settings : { availableFields: [...AVAILABLE_FIELDS] };
        this.initForm();
      },
      error: (err: any) => this.alert.error('Failed to load settings: ' + err.message)
    });
  }

  ngOnDestroy(): void {
    if (this.configSubscription) {
        this.configSubscription.unsubscribe();
    }
  }

  initForm() {
    this.fieldsFormArray.clear();
    this.settings.availableFields.forEach(field => {
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

  drop(event: CdkDragDrop<FormGroup[]>) {
    moveItemInArray(this.fieldsFormArray.controls, event.previousIndex, event.currentIndex);
    this.form.markAsDirty();
  }

  // NOWA METODA: Zastępuje selectAll() i unselectAll()
  toggleSelectAll(event: MatCheckboxChange) {
    this.fieldsFormArray.controls.forEach(control => {
      control.get('selected')?.setValue(event.checked);
    });
    this.form.markAsDirty();
  }

  resetSettings() {
    this.alert.info('Settings have been reset. Click Save to apply.', { autoClose: true });
    this.settings.availableFields = JSON.parse(JSON.stringify(AVAILABLE_FIELDS));
    this.initForm();
    this.form.markAsDirty();
  }

  saveSettings() {
    if (this.saving) return; 
    this.saving = true;
    
    const fieldsToSave: FieldConfig[] = this.fieldsFormArray.controls.map(control => control.value);
    
    this.settingsService.set({ availableFields: fieldsToSave } as AppSettings).subscribe({
      next: () => {
        this.saving = false;
        this.alert.success('Settings saved successfully!');
        this.router.navigate(['/']); 
      },
      error: (err: any) => {
        this.saving = false;
        this.alert.error('Failed to save settings: ' + err.message);
      }
    });
  }

  onCancel(): void {
    this.router.navigate(['/']); 
  }
}

