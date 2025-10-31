import { ComponentFixture, TestBed, waitForAsync, fakeAsync, tick } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { MatCheckboxChange, MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { TranslateModule, TranslateLoader, TranslateService } from '@ngx-translate/core';
import { Observable, of, throwError } from 'rxjs';
import { AlertService, CloudAppSettingsService } from '@exlibris/exl-cloudapp-angular-lib';

import { SettingsComponent } from './settings.component';
import { SettingsService } from '../settings.service';
import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatCheckboxHarness } from '@angular/material/checkbox/testing';


class FakeTranslateLoader implements TranslateLoader {
  getTranslation(lang: string): Observable<any> {
    return of({}); 
  }
}

interface FieldConfig {
  name: string;
  label: string;
  selected: boolean;
  customLabel: string;
}

interface AppSettings {
  availableFields: FieldConfig[];
  customHeader: string;
}

interface ProcessedSettings {
  settings: AppSettings;
}

const MOCK_AVAILABLE_FIELDS: FieldConfig[] = [
  { name: 'default1', label: 'Default 1', selected: true, customLabel: 'Default 1 Label' },
  { name: 'default2', label: 'Default 2', selected: true, customLabel: 'Default 2 Label' },
];


const mockAlertService = jasmine.createSpyObj('AlertService', ['success', 'error', 'info']);
const mockCloudSettingsService = jasmine.createSpyObj('CloudAppSettingsService', ['set']);
const mockSettingsService = jasmine.createSpyObj('SettingsService', ['getSettings']);

const MOCK_SETTINGS: AppSettings = {
  availableFields: [
    { name: 'field1', label: 'Field 1', selected: true, customLabel: 'Custom 1' },
    { name: 'field2', label: 'Field 2', selected: false, customLabel: 'Custom 2' }
  ],
  customHeader: 'Test Header'
};

const MOCK_PROCESSED_SETTINGS: ProcessedSettings = {
  settings: MOCK_SETTINGS,
};


describe('SettingsComponent', () => {
  let component: SettingsComponent;
  let fixture: ComponentFixture<SettingsComponent>;
  let loader: HarnessLoader;

  let settingsSvcSpy: jasmine.SpyObj<SettingsService>;
  let cloudSettingsSvcSpy: jasmine.SpyObj<CloudAppSettingsService>;
  let alertSvcSpy: jasmine.SpyObj<AlertService>;
  let router: Router;

  let originalAvailableFields: any;
  beforeAll(() => {
  });

  beforeEach(waitForAsync(() => {

    mockSettingsService.getSettings.and.returnValue(of(MOCK_PROCESSED_SETTINGS));
    mockCloudSettingsService.set.and.returnValue(of({})); 

    TestBed.configureTestingModule({
      declarations: [ SettingsComponent ],
      imports: [
        BrowserAnimationsModule,
        ReactiveFormsModule,
        RouterTestingModule.withRoutes([{ path: '', component: SettingsComponent }]), 
TranslateModule.forRoot({
          loader: {
            provide: TranslateLoader,
            useClass: FakeTranslateLoader
          }}),
        DragDropModule,
        MatCheckboxModule,
        MatFormFieldModule,
        MatInputModule,
        MatIconModule,
        MatProgressSpinnerModule,
        MatButtonModule,
        MatDialogModule
      ],
      providers: [
        { provide: AlertService, useValue: mockAlertService },
        { provide: CloudAppSettingsService, useValue: mockCloudSettingsService },
        { provide: SettingsService, useValue: mockSettingsService },
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SettingsComponent);
    component = fixture.componentInstance;
    loader = TestbedHarnessEnvironment.loader(fixture);

    settingsSvcSpy = TestBed.inject(SettingsService) as jasmine.SpyObj<SettingsService>;
    cloudSettingsSvcSpy = TestBed.inject(CloudAppSettingsService) as jasmine.SpyObj<CloudAppSettingsService>;
    alertSvcSpy = TestBed.inject(AlertService) as jasmine.SpyObj<AlertService>;
    router = TestBed.inject(Router);

    settingsSvcSpy.getSettings.calls.reset();
    cloudSettingsSvcSpy.set.calls.reset();
    alertSvcSpy.success.calls.reset();
    alertSvcSpy.error.calls.reset();
    alertSvcSpy.info.calls.reset();

    spyOn(router, 'navigate').and.stub();
  });


  it('should create', () => {
    fixture.detectChanges(); 
    expect(component).toBeTruthy();
  });

  it('should load settings and initialize the form on init', () => {
    fixture.detectChanges(); 

    expect(settingsSvcSpy.getSettings).toHaveBeenCalledTimes(1);

    expect(component.form.get('customHeader')?.value).toBe('Test Header');
    expect(component.fieldsFormArray.length).toBe(2);
    expect(component.fieldsFormArray.at(0).value.name).toBe('field1');
    expect(component.fieldsFormArray.at(1).value.selected).toBe(false);
  });

  it('should save settings, show success, and navigate on save', fakeAsync(() => {
    fixture.detectChanges(); 

    component.form.markAsDirty();

    component.saveSettings();
    tick(); 

    expect(cloudSettingsSvcSpy.set).toHaveBeenCalledWith(component.form.value);

    expect(component.saving).toBe(false);

    expect(alertSvcSpy.success).toHaveBeenCalled();

    expect(router.navigate).toHaveBeenCalledWith(['/']);
  }));

  it('should show error and not navigate if save fails', fakeAsync(() => {
    const errorResponse = new Error('Błąd zapisu');
    cloudSettingsSvcSpy.set.and.returnValue(throwError(() => errorResponse));

    fixture.detectChanges(); 
    component.form.markAsDirty();

    component.saveSettings();
    tick();

    expect(cloudSettingsSvcSpy.set).toHaveBeenCalled();

    expect(component.saving).toBe(false);

    expect(alertSvcSpy.error).toHaveBeenCalled();

    expect(alertSvcSpy.success).not.toHaveBeenCalled();

    expect(router.navigate).not.toHaveBeenCalled();
  }));

  it('should reset settings to default and mark form as dirty', () => {
    fixture.detectChanges(); 

    component.form.get('customHeader')?.setValue('Nowy nagłówek');
    expect(component.form.get('customHeader')?.value).toBe('Nowy nagłówek');

    component.resetSettings();

    expect(alertSvcSpy.info).toHaveBeenCalled();

    expect(component.form.get('customHeader')?.value).toBe('# PO Line Export');

    expect(component.form.dirty).toBe(true);

    expect(component.fieldsFormArray.length).toBeGreaterThan(0);
  });

  it('should navigate to home on cancel', () => {
    fixture.detectChanges();
    component.onCancel();
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });

  it('should update selection getters correctly', () => {
    fixture.detectChanges(); 

    expect(component.selectedFieldsCount).toBe(1);
    expect(component.allFieldsSelected).toBe(false);
    expect(component.someFieldsSelected).toBe(true);

    component.fieldsFormArray.at(1).get('selected')?.setValue(true);
    fixture.detectChanges();

    expect(component.selectedFieldsCount).toBe(2);
    expect(component.allFieldsSelected).toBe(true);
    expect(component.someFieldsSelected).toBe(false);

    const event = { checked: false } as MatCheckboxChange;
    component.toggleSelectAll(event);
    fixture.detectChanges();

    expect(component.selectedFieldsCount).toBe(0);
    expect(component.allFieldsSelected).toBe(false);
    expect(component.someFieldsSelected).toBe(false);
  });

  it('should use harnesses to test UI actions', async () => {
    fixture.detectChanges(); 

    const homeButton = await loader.getHarness(MatButtonHarness.with({ text: /TopMenu.Home/ }));
    await homeButton.click();

    const selectAllCheckbox = await loader.getHarness(MatCheckboxHarness.with({ label: /Settings.Fields.ToggleAll/ }));
    expect(await selectAllCheckbox.isIndeterminate()).toBe(true);

    await selectAllCheckbox.check();
    fixture.detectChanges();

    expect(await selectAllCheckbox.isChecked()).toBe(true);
    expect(await selectAllCheckbox.isIndeterminate()).toBe(false);
    expect(component.selectedFieldsCount).toBe(2);

    await selectAllCheckbox.uncheck();
    fixture.detectChanges();

    expect(await selectAllCheckbox.isChecked()).toBe(false);
    expect(component.selectedFieldsCount).toBe(0);

  }); 

  it('should toggle expand index', () => {
    fixture.detectChanges(); 

    expect(component.expandedIndex).toBeNull();

    component.toggleExpand(1);
    expect(component.expandedIndex).toBe(1);

    component.toggleExpand(1);
    expect(component.expandedIndex).toBeNull();

    component.toggleExpand(0);
    expect(component.expandedIndex).toBe(0);
    component.toggleExpand(2);
    expect(component.expandedIndex).toBe(2);
  });

  it('should re-order fields on drop and mark form as dirty', () => {
    fixture.detectChanges(); 

    expect(component.fieldsFormArray.at(0).value.name).toBe('field1');
    expect(component.fieldsFormArray.at(1).value.name).toBe('field2');

    component.form.markAsPristine();
    expect(component.form.dirty).toBe(false);

    const mockEvent = {
      previousIndex: 0,
      currentIndex: 1,
    } as CdkDragDrop<any[]>; 

    component.drop(mockEvent);
    fixture.detectChanges();

    expect(component.fieldsFormArray.at(0).value.name).toBe('field2');
    expect(component.fieldsFormArray.at(1).value.name).toBe('field1');

    expect(component.form.dirty).toBe(true);
  });

});