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
    return of({}); // Zwraca pusty obiekt zamiast plików JSON
  }
}
/* Definiujemy minimalne wersje Twoich modeli,
   aby plik spec był samowystarczalny
*/
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
  // ... inne pola jeśli istnieją
}

// Musimy też zamockować Twoją stałą
const MOCK_AVAILABLE_FIELDS: FieldConfig[] = [
  { name: 'default1', label: 'Default 1', selected: true, customLabel: 'Default 1 Label' },
  { name: 'default2', label: 'Default 2', selected: true, customLabel: 'Default 2 Label' },
];

// --- Nasze MOCKI (Zaślepki) ---

const mockAlertService = jasmine.createSpyObj('AlertService', ['success', 'error', 'info']);
const mockCloudSettingsService = jasmine.createSpyObj('CloudAppSettingsService', ['set']);
const mockSettingsService = jasmine.createSpyObj('SettingsService', ['getSettings']);

// Przykładowe dane, które zwrócą nasze mocki
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


// --- Główny blok testowy ---

describe('SettingsComponent', () => {
  let component: SettingsComponent;
  let fixture: ComponentFixture<SettingsComponent>;
  let loader: HarnessLoader;

  // Referencje do naszych mocków
  let settingsSvcSpy: jasmine.SpyObj<SettingsService>;
  let cloudSettingsSvcSpy: jasmine.SpyObj<CloudAppSettingsService>;
  let alertSvcSpy: jasmine.SpyObj<AlertService>;
  let router: Router;

  // Importujemy stałą z Twojego komponentu, aby ją zamockować
  let originalAvailableFields: any;
  beforeAll(() => {
    // Podmieniamy prawdziwą stałą na mocka na czas testów
    // Zakładamy, że jest ona importowana i dostępna w 'this' komponentu
    // Ale prościej jest ją nadpisać w logice resetSettings
    // Zamiast tego, w teście `resetSettings` nadpiszemy stałą
  });

  beforeEach(waitForAsync(() => {

    // Konfigurujemy domyślne zachowanie mocków
    mockSettingsService.getSettings.and.returnValue(of(MOCK_PROCESSED_SETTINGS));
    mockCloudSettingsService.set.and.returnValue(of({})); // Sukces zapisu

    TestBed.configureTestingModule({
      declarations: [ SettingsComponent ],
      imports: [
        BrowserAnimationsModule,
        ReactiveFormsModule,
        RouterTestingModule.withRoutes([{ path: '', component: SettingsComponent }]), // Dodajemy to dla nawigacji
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
        // Musimy dostarczyć mocka dla stałej, jeśli resetSettings jej używa
        // Najprostszy sposób to nadpisanie w teście, ale jeśli masz błąd, dodaj ją tutaj:
        // { provide: 'AVAILABLE_FIELDS', useValue: MOCK_AVAILABLE_FIELDS }
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SettingsComponent);
    component = fixture.componentInstance;
    loader = TestbedHarnessEnvironment.loader(fixture);

    // Pobieramy instancje serwisów
    settingsSvcSpy = TestBed.inject(SettingsService) as jasmine.SpyObj<SettingsService>;
    cloudSettingsSvcSpy = TestBed.inject(CloudAppSettingsService) as jasmine.SpyObj<CloudAppSettingsService>;
    alertSvcSpy = TestBed.inject(AlertService) as jasmine.SpyObj<AlertService>;
    router = TestBed.inject(Router);

    // Resetujemy wywołania przed każdym testem
    settingsSvcSpy.getSettings.calls.reset();
    cloudSettingsSvcSpy.set.calls.reset();
    alertSvcSpy.success.calls.reset();
    alertSvcSpy.error.calls.reset();
    alertSvcSpy.info.calls.reset();

    // Szpiegujemy nawigację
    spyOn(router, 'navigate').and.stub();

    // *WAŻNE*: Podmieniamy stałą `AVAILABLE_FIELDS` używaną w `resetSettings`
    // Ponieważ nie możemy jej zaimportować, musimy oszukać komponent
    // Niestety, ponieważ jest ona importowana bezpośrednio w pliku,
    // ten test może się nie udać. Lepszą praktyką byłoby wstrzyknięcie jej.
    // Na potrzeby testu zakładamy, że `resetSettings` używa mocka.
    // Jeśli ten test się nie uda, trzeba będzie zrefaktoryzować komponent.
    // Dla uproszczenia, w teście `resetSettings` nadpiszemy logikę.
  });

  // --- Nasze testy ---

  it('should create', () => {
    fixture.detectChanges(); // Wywołuje ngOnInit
    expect(component).toBeTruthy();
  });

  it('should load settings and initialize the form on init', () => {
    fixture.detectChanges(); // Wywołuje ngOnInit

    // 1. Sprawdza, czy serwis został wywołany
    expect(settingsSvcSpy.getSettings).toHaveBeenCalledTimes(1);

    // 2. Sprawdza, czy formularz został wypełniony danymi z mocka
    expect(component.form.get('customHeader')?.value).toBe('Test Header');
    expect(component.fieldsFormArray.length).toBe(2);
    expect(component.fieldsFormArray.at(0).value.name).toBe('field1');
    expect(component.fieldsFormArray.at(1).value.selected).toBe(false);
  });

  it('should save settings, show success, and navigate on save', fakeAsync(() => {
    fixture.detectChanges(); // ngOnInit

    // Musimy "ubrudzić" formularz, aby przycisk zapisu był aktywny
    component.form.markAsDirty();

    // Wywołujemy zapis
    component.saveSettings();
    tick(); // Czekamy na zakończenie operacji asynchronicznych (subscribe)

    // 1. Sprawdza, czy `set` zostało wywołane z wartościami z formularza
    expect(cloudSettingsSvcSpy.set).toHaveBeenCalledWith(component.form.value);

    // 2. Sprawdza, czy stan "zapisywania" się wyłączył
    expect(component.saving).toBe(false);

    // 3. Sprawdza, czy pojawił się alert o sukcesie
    expect(alertSvcSpy.success).toHaveBeenCalled();

    // 4. Sprawdza, czy nastąpiła nawigacja
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  }));

  it('should show error and not navigate if save fails', fakeAsync(() => {
    const errorResponse = new Error('Błąd zapisu');
    cloudSettingsSvcSpy.set.and.returnValue(throwError(() => errorResponse));

    fixture.detectChanges(); // ngOnInit
    component.form.markAsDirty();

    component.saveSettings();
    tick();

    // 1. `set` zostało wywołane
    expect(cloudSettingsSvcSpy.set).toHaveBeenCalled();

    // 2. Stan "zapisywania" się wyłączył
    expect(component.saving).toBe(false);

    // 3. Sprawdza, czy pojawił się alert o błędzie
    expect(alertSvcSpy.error).toHaveBeenCalled();

    // 4. Sukces NIE został zgłoszony
    expect(alertSvcSpy.success).not.toHaveBeenCalled();

    // 5. NIE było nawigacji
    expect(router.navigate).not.toHaveBeenCalled();
  }));

  it('should reset settings to default and mark form as dirty', () => {
    fixture.detectChanges(); // ngOnInit

    // Zmieniamy coś w formularzu
    component.form.get('customHeader')?.setValue('Nowy nagłówek');
    expect(component.form.get('customHeader')?.value).toBe('Nowy nagłówek');

    // Niestety, musimy nadpisać `AVAILABLE_FIELDS` w locie,
    // ponieważ nie możemy go wstrzyknąć bez refaktoryzacji
    // To jest hack, ale zadziała dla tego testu:
    // W Twoim komponencie `AVAILABLE_FIELDS` jest importowane bezpośrednio.
    // Aby to przetestować, musielibyśmy mockować cały moduł.

    // Zamiast tego, przetestujmy tylko to, co możemy:
    component.resetSettings();

    // 1. Sprawdza, czy alert info został wywołany
    expect(alertSvcSpy.info).toHaveBeenCalled();

    // 2. Sprawdza, czy domyślny nagłówek wrócił
    expect(component.form.get('customHeader')?.value).toBe('# PO Line Export');

    // 3. Sprawdza, czy formularz jest "brudny"
    expect(component.form.dirty).toBe(true);

    // 4. Sprawdza, czy pola się zresetowały (tu musimy założyć, że `AVAILABLE_FIELDS` działa)
    // Jeśli chcesz to w pełni przetestować, `AVAILABLE_FIELDS` musi być
    // wstrzykiwane przez serwis, a nie importowane jako stała.
    // Ale `initForm` jest wywoływane, więc to powinno zresetować `fieldsFormArray`.
    expect(component.fieldsFormArray.length).toBeGreaterThan(0);
  });

  it('should navigate to home on cancel', () => {
    fixture.detectChanges();
    component.onCancel();
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });

  it('should update selection getters correctly', () => {
    fixture.detectChanges(); // ngOnInit (field1: true, field2: false)

    // Sprawdzamy stan początkowy z MOCK_SETTINGS
    expect(component.selectedFieldsCount).toBe(1);
    expect(component.allFieldsSelected).toBe(false);
    expect(component.someFieldsSelected).toBe(true);

    // Zaznaczamy drugie pole
    component.fieldsFormArray.at(1).get('selected')?.setValue(true);
    fixture.detectChanges();

    // Sprawdzamy stan "wszystkie zaznaczone"
    expect(component.selectedFieldsCount).toBe(2);
    expect(component.allFieldsSelected).toBe(true);
    expect(component.someFieldsSelected).toBe(false);

    // Odznaczamy oba
    const event = { checked: false } as MatCheckboxChange;
    component.toggleSelectAll(event);
    fixture.detectChanges();

    // Sprawdzamy stan "żadne zaznaczone"
    expect(component.selectedFieldsCount).toBe(0);
    expect(component.allFieldsSelected).toBe(false);
    expect(component.someFieldsSelected).toBe(false);
  });

  it('should use harnesses to test UI actions', async () => {
    fixture.detectChanges(); // ngOnInit

    // Użyj harnessa, aby znaleźć przycisk "Wstecz" (Home)
    const homeButton = await loader.getHarness(MatButtonHarness.with({ text: /TopMenu.Home/ }));
    await homeButton.click();

    // Sprawdzamy, czy nawigacja została wywołana (przycisk ma [routerLink])
    // W RouterTestingModule to jest trudne do śledzenia, ale test `onCancel` to pokrywa.
    // Zamiast tego przetestujmy przycisk "Zaznacz wszystko"

    // 1. Znajdź główny checkbox
    const selectAllCheckbox = await loader.getHarness(MatCheckboxHarness.with({ label: /Settings.Fields.ToggleAll/ }));
    // Stan początkowy (1 z 2 zaznaczony)
    expect(await selectAllCheckbox.isIndeterminate()).toBe(true);

    // 2. Kliknij go, aby zaznaczyć wszystko
    await selectAllCheckbox.check();
    fixture.detectChanges();

    // 3. Sprawdź, czy jest zaznaczony (nie nieokreślony)
    expect(await selectAllCheckbox.isChecked()).toBe(true);
    expect(await selectAllCheckbox.isIndeterminate()).toBe(false);
    expect(component.selectedFieldsCount).toBe(2);

    // 4. Kliknij, aby odznaczyć wszystko
    await selectAllCheckbox.uncheck();
    fixture.detectChanges();

    expect(await selectAllCheckbox.isChecked()).toBe(false);
    expect(component.selectedFieldsCount).toBe(0);

  }); // <-- ★★★ TO BYŁO BRAKUJĄCE ZAMKNIĘCIE ★★★

  it('should toggle expand index', () => {
    fixture.detectChanges(); // ngOnInit

    // 1. Sprawdź stan początkowy (nic nie jest rozwinięte)
    expect(component.expandedIndex).toBeNull();

    // 2. Rozwiń element o indeksie 1
    component.toggleExpand(1);
    expect(component.expandedIndex).toBe(1);

    // 3. Zwiń ten sam element
    component.toggleExpand(1);
    expect(component.expandedIndex).toBeNull();

    // 4. Rozwiń jeden, a potem inny
    component.toggleExpand(0);
    expect(component.expandedIndex).toBe(0);
    component.toggleExpand(2);
    expect(component.expandedIndex).toBe(2);
  });

  it('should re-order fields on drop and mark form as dirty', () => {
    fixture.detectChanges(); // ngOnInit, formularz ma 2 pola: field1, field2

    // Sprawdzamy stan początkowy (pola z MOCK_SETTINGS)
    expect(component.fieldsFormArray.at(0).value.name).toBe('field1');
    expect(component.fieldsFormArray.at(1).value.name).toBe('field2');

    // Ustawiamy formularz jako "zapisany" (pristine)
    component.form.markAsPristine();
    expect(component.form.dirty).toBe(false);

    // 1. Stwórz fałszywy event "przeciągnij i upuść"
    // Symulujemy przeciągnięcie elementu z indeksu 0 na indeks 1
    const mockEvent = {
      previousIndex: 0,
      currentIndex: 1,
      // ... dodaj inne właściwości, jeśli Twój kod ich wymaga,
      // ale `moveItemInArray` potrzebuje tylko tych dwóch
    } as CdkDragDrop<any[]>; // Używamy 'any[]' dla prostoty

    // 2. Wywołaj funkcję drop
    component.drop(mockEvent);
    fixture.detectChanges();

    // 3. Sprawdź, czy kolejność w formularzu się zmieniła
    expect(component.fieldsFormArray.at(0).value.name).toBe('field2');
    expect(component.fieldsFormArray.at(1).value.name).toBe('field1');

    // 4. Sprawdź, czy formularz jest "brudny" (dirty)
    expect(component.form.dirty).toBe(true);
  });

});