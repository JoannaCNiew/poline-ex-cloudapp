import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormGroup, FormArray, FormControl } from '@angular/forms';
import { CloudAppConfigService, AlertService, CloudAppSettingsService } from '@exlibris/exl-cloudapp-angular-lib'; // DODANO CloudAppSettingsService
import { AVAILABLE_FIELDS } from '../main/field-definitions'; 
import { Router } from '@angular/router';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { AppSettings, FieldConfig } from '../models/settings';
import { Subscription } from 'rxjs'; 

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit, OnDestroy {

  settings: AppSettings = { availableFields: [] };
  form!: FormGroup;
  saving = false;
  
  // Właściwości dla Drag and Drop
  expandedIndex: number | null = null;
  hoverIndex: number | null = null;
  
  private configSubscription: Subscription | undefined;

  // Właściwość pomocnicza do łatwego dostępu do FormArray
  get fieldsFormArray(): FormArray {
    return this.form.get('availableFields') as FormArray;
  }

  constructor(
    private settingsService: CloudAppSettingsService, // <--- ZMIENIONO NA SettingsService
    private alert: AlertService,
    public router: Router, 
  ) {
    this.form = new FormGroup({
      availableFields: new FormArray([])
    });
  }

  ngOnInit() {
    // Wczytywanie konfiguracji z Alma
    this.configSubscription = this.settingsService.get().subscribe({ // <--- UŻYWAMY settingsService.get()
      next: (settings: any) => {
        this.settings = settings && settings.availableFields ? settings : { availableFields: [...AVAILABLE_FIELDS] };
        this.initForm();
      },
      error: (err: any) => this.alert.error('Nie udało się wczytać ustawień: ' + err.message)
    });
  }

  ngOnDestroy(): void {
    if (this.configSubscription) {
        this.configSubscription.unsubscribe();
    }
  }

  initForm() {
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

  saveSettings() {
    if (this.saving) return; 
    this.saving = true;
    
    const fieldsToSave: FieldConfig[] = this.fieldsFormArray.controls.map(control => control.value);
    
    this.settingsService.set({ availableFields: fieldsToSave } as AppSettings).subscribe({ // <--- UŻYWAMY settingsService.set()
      next: () => {
        this.saving = false;
        this.alert.success('Ustawienia zostały zapisane!');
        this.router.navigate(['/']); 
      },
      error: (err: any) => {
        this.saving = false;
        this.alert.error('Nie udało się zapisać ustawień: ' + err.message);
      }
    });
  }

  onCancel(): void {
      this.router.navigate(['/']); 
  }
}
