import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { SettingsComponent } from './settings.component';
import { RouterTestingModule } from '@angular/router/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ReactiveFormsModule, FormBuilder, FormArray, FormGroup } from '@angular/forms';
import { HttpClientModule, HttpClient } from '@angular/common/http';

import { TranslateModule, TranslateLoader, TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { DragDropModule, CdkDropList, CdkDragDrop } from '@angular/cdk/drag-drop';
import { MaterialModule, CloudAppSettingsService, AlertService } from '@exlibris/exl-cloudapp-angular-lib';
import { MatCheckboxChange } from '@angular/material/checkbox';

// --- MOCK SERVICES & DATA ---

// Mock dla TranslateLoader
export class TranslateHttpLoaderMock implements TranslateLoader {
  getTranslation(lang: string): any {
    return of({}); 
  }
}

// Mock dla CloudAppSettingsService 
const mockCloudAppSettingsService = {
  get: () => of({ availableFields: [], customHeader: '# PO Line Export' }),
  set: () => of({}) 
};

// Mock dla AlertService
const mockAlertService = {
  success: () => {},
  error: () => {},
  info: () => {}
};

// POPRAWIONY MOCK DANYCH: Zgodny z 10 polami z field-definitions.ts
const mockAvailableFields = [
    { name: 'isbn', label: 'ISBN Label', selected: true, customLabel: 'Fields.ISBN' },
    { name: 'title', label: 'Title Label', selected: true, customLabel: 'Fields.Title' },
    { name: 'quantity', label: 'Quantity Label', selected: true, customLabel: 'Fields.Quantity' },
    { name: 'poNumber', label: 'PONumber Label', selected: false, customLabel: 'Fields.PONumber' }, 
    { name: 'author', label: 'Author Label', selected: false, customLabel: 'Fields.Author' },
    { name: 'line_number', label: 'LineNumber Label', selected: false, customLabel: 'Fields.LineNumber' },
    { name: 'owner', label: 'Owner Label', selected: false, customLabel: 'Fields.Owner' },
    { name: 'vendor', label: 'Vendor Label', selected: false, customLabel: 'Fields.Vendor' },
    { name: 'price', label: 'Price Label', selected: false, customLabel: 'Fields.Price' },
    { name: 'fund', label: 'Fund Label', selected: false, customLabel: 'Fields.Fund' },
];

// Zdefiniowanie stałej AVAILABLE_FIELDS jako mocka, aby została użyta przez metodę resetSettings
const AVAILABLE_FIELDS = mockAvailableFields;

// --- TEST SUITE ---

describe('SettingsComponent', () => {
    let component: SettingsComponent;
    let fixture: ComponentFixture<SettingsComponent>;
    let alertService: AlertService;
    let settingsService: CloudAppSettingsService;
    let translateService: TranslateService;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            imports: [
                BrowserAnimationsModule,
                RouterTestingModule,
                MaterialModule,
                ReactiveFormsModule, 
                DragDropModule, 
                HttpClientModule,
                TranslateModule.forRoot({
                    loader: {
                        provide: TranslateLoader,
                        useClass: TranslateHttpLoaderMock,
                        deps: [HttpClient] 
                    }
                }),
            ],
            declarations: [SettingsComponent], 
            providers: [
                { provide: CloudAppSettingsService, useValue: mockCloudAppSettingsService },
                { provide: AlertService, useValue: mockAlertService },
                FormBuilder,
                TranslateService,
            ]
        })
        .compileComponents();
    }));

    beforeEach(() => {
        settingsService = TestBed.inject(CloudAppSettingsService);
        spyOn(settingsService, 'get').and.returnValue(of({
            availableFields: mockAvailableFields,
            customHeader: 'Initial Header'
        }));
        
        translateService = TestBed.inject(TranslateService);
        spyOn(translateService, 'instant').and.callFake((key: string) => `Translated: ${key}`);

        fixture = TestBed.createComponent(SettingsComponent);
        component = fixture.componentInstance;
        alertService = TestBed.inject(AlertService);
        fixture.detectChanges(); 
    });

    it('should create and initialize the form with fields', () => {
        expect(component).toBeTruthy();
        expect(component.form).toBeDefined();
        // Oczekujemy 10 pól
        expect(component.fieldsFormArray.length).toBe(10); 
    });

    it('should call settingsService.set() when saveSettings is called', () => {
        const settingsServiceSpy = spyOn(settingsService, 'set').and.callThrough();
        
        component.form.get('customHeader')?.setValue('New Header');
        component.form.markAsDirty();

        component.saveSettings();

        expect(settingsServiceSpy).toHaveBeenCalled();
    });

    // --- TEST: RESETOWANIE USTAWIEŃ ---
    it('should reset settings to default fields and header', () => {
        const alertSpy = spyOn(alertService, 'info');

        // Upewniamy się, że jesteśmy w stanie 'dirty'
        component.fieldsFormArray.removeAt(0);
        component.form.get('customHeader')?.setValue('Junk Header');
        component.form.markAsDirty();
        
        component.resetSettings();
        
        // Oczekujemy 10 pól po resecie
        expect(component.fieldsFormArray.length).toBe(10); 
        expect(component.form.get('customHeader')?.value).toBe('# PO Line Export');
        expect(alertSpy).toHaveBeenCalled(); 
    });

    // --- TEST: TOGGLE SELECT ALL (zaznaczanie wszystkich) ---
    it('should select all fields when toggleSelectAll is checked', () => {
        // Początkowo 3 z 10 pól jest zaznaczonych (zgodnie z mockiem)
        expect(component.allFieldsSelected).toBeFalse(); 
        
        component.toggleSelectAll({ checked: true } as MatCheckboxChange); 
        
        // Liczba zaznaczonych pól = 10
        expect(component.selectedFieldsCount).toBe(component.fieldsFormArray.length); 
        expect(component.allFieldsSelected).toBeTrue();
        expect(component.form.dirty).toBeTrue();
    });

    // --- TEST: DRAG AND DROP (przeciąganie i upuszczanie) ---
    it('should change field order when drop event is fired', () => {
        const initialFirstName = component.fieldsFormArray.at(0).get('name')?.value; // 'isbn'

        const mockEvent = {
            previousIndex: 0,
            currentIndex: 1,
            container: {} as CdkDropList,
            item: {} as any,
            isPointerOverContainer: true,
            distance: { x: 0, y: 0 }
        } as CdkDragDrop<FormGroup[]>;

        component.drop(mockEvent);

        const newFirstName = component.fieldsFormArray.at(0).get('name')?.value; // Powinno być 'title'
        expect(newFirstName).not.toBe(initialFirstName);
        expect(component.form.dirty).toBeTrue();
    });
});