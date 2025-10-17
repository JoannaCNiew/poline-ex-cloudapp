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

  settings: AppSettings = { availableFields: [], customHeader: '# PO Line Export' };
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

  get allFieldsSelected(): boolean {
    return this.fieldsFormArray.length > 0 && this.selectedFieldsCount === this.fieldsFormArray.length;
  }

  get someFieldsSelected(): boolean {
    return this.selectedFieldsCount > 0 && !this.allFieldsSelected;
  }

  constructor(
    private settingsService: CloudAppSettingsService,
    private alert: AlertService,
    public router: Router, 
  ) {
    this.form = new FormGroup({
      availableFields: new FormArray([]),
      customHeader: new FormControl('')
    });
  }

  ngOnInit() {
    this.configSubscription = this.settingsService.get().subscribe({
      next: (settings: any) => {
        const defaultSettings: AppSettings = { availableFields: [...AVAILABLE_FIELDS], customHeader: '# PO Line Export' };
        this.settings = settings && settings.availableFields ? settings : defaultSettings;
        if (!this.settings.customHeader) {
          this.settings.customHeader = defaultSettings.customHeader;
        }
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
    this.form.patchValue({ customHeader: this.settings.customHeader });
  }
  
  toggleExpand(index: number) {
    this.expandedIndex = this.expandedIndex === index ? null : index;
  }

  drop(event: CdkDragDrop<FormGroup[]>) {
    moveItemInArray(this.fieldsFormArray.controls, event.previousIndex, event.currentIndex);
    this.form.markAsDirty();
  }

  toggleSelectAll(event: MatCheckboxChange) {
    this.fieldsFormArray.controls.forEach(control => {
      control.get('selected')?.setValue(event.checked);
    });
    this.form.markAsDirty();
  }

  resetSettings() {
    this.alert.info('Settings have been reset. Click Save to apply.', { autoClose: true });
    const defaultSettings: AppSettings = { 
      availableFields: JSON.parse(JSON.stringify(AVAILABLE_FIELDS)), 
      customHeader: '# PO Line Export' 
    };
    this.settings = defaultSettings;
    this.initForm();
    this.form.markAsDirty();
  }

  saveSettings() {
    if (this.saving) return; 
    this.saving = true;
    
    this.settingsService.set(this.form.value).subscribe({
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