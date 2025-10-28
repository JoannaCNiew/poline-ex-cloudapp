import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { CommonModule } from '@angular/common';
import { HttpClientTestingModule } from '@angular/common/http/testing'; // KLUCZOWY IMPORT
import { HttpClient } from '@angular/common/http'; // KONIECZNY DO PROVIDERS

import { MainComponent } from './main.component';
import { SelectEntitiesModule } from '@exlibris/eca-components'; 

import { map } from 'rxjs/operators'; 

import { 
    AlertService, 
    CloudAppEventsService, 
    CloudAppRestService, 
    CloudAppSettingsService,
    MaterialModule,
    Entity,
    EntityType,
    HttpMethod 
} from '@exlibris/exl-cloudapp-angular-lib';
import { TranslateModule, TranslateService, TranslateLoader } from '@ngx-translate/core';
import { of, Subject } from 'rxjs';

// --- MOCK SERVICES & DATA ---

// Mock dla TranslateLoader (rozwiązuje błąd subskrypcji)
export class TranslateHttpLoaderMock implements TranslateLoader {
  getTranslation(lang: string): any {
    return of({}); 
  }
}

const mockEntities: Entity[] = [
    { id: '1', link: 'api/alma/v1/p-lines/1', type: 'PO_LINE' as EntityType, description: 'PL-1' },
    { id: '2', link: 'api/alma/v1/p-lines/2', type: 'PO_LINE' as EntityType, description: 'PL-2' }
];

const mockRestResponse1 = {
    resource_metadata: { isbn: '12345', title: 'Title 1', author: 'Author A' },
    po_number: 'PO1',
    price: { sum: 10.00 },
    location: [{ quantity: 1 }],
    line_number: 'L1', owner: { desc: 'Owner Desc' }, vendor: { desc: 'Vendor Desc' }, fund_ledger: { name: 'Fund A' }
};
const mockRestResponse2 = {
    resource_metadata: { isbn: '67890', title: 'Title 2', author: 'Author B' },
    po_number: 'PO2',
    price: { amount: 20.00 },
    location: [{ quantity: 2 }],
    line_number: 'L2', owner: { desc: 'Owner Desc' }, vendor: { desc: 'Vendor Desc' }, fund_ledger: { name: 'Fund B' }
};

const mockSettings = {
    availableFields: [
        { name: 'isbn', selected: true, customLabel: 'ISBN' },
        { name: 'title', selected: true, customLabel: 'Title' },
        { name: 'poNumber', selected: false, customLabel: 'PO Number' }
    ],
    customHeader: '# Test Header'
};

const onPageLoadSubject$ = new Subject<any>();

const mockEventsService = {
    entities$: onPageLoadSubject$.asObservable().pipe(
        map((info: any) => info.entities)
    ),
    onPageLoad: (handler: (data: any) => void) => onPageLoadSubject$.subscribe(data => handler(data)), 
};

const mockRestService = {
    call: (request: any) => { 
        if (request.url.includes('1')) return of(mockRestResponse1);
        if (request.url.includes('2')) return of(mockRestResponse2);
        return of({});
    }
};

const mockSettingsService = {
    get: () => of(mockSettings),
};

const mockAlertService = {
    success: (message: any) => {}, 
    warn: (message: any) => {},
    error: (message: any) => {}
};

const mockTranslateService = {
    instant: (key: string) => `T:${key}`,
    get: (keys: string[]) => of(keys.reduce((acc, key) => ({ ...acc, [key]: `T:${key}` }), {} as any)),
    onLangChange: of({ lang: 'pl' })
};

// --- TEST SUITE ---

describe('MainComponent', () => {
    let component: MainComponent;
    let fixture: ComponentFixture<MainComponent>;
    let restService: CloudAppRestService;
    let eventsService: CloudAppEventsService;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            imports: [
                CommonModule,
                MaterialModule,
                // ZASTĘPUJE HttpClientModule w testach:
                HttpClientTestingModule, 
                FormsModule,
                BrowserAnimationsModule,
                RouterTestingModule,
                SelectEntitiesModule, 
                
                TranslateModule.forRoot({
                    loader: {
                        provide: TranslateLoader,
                        useClass: TranslateHttpLoaderMock,
                        deps: [HttpClient] 
                    }
                })
            ],
            declarations: [MainComponent], 
            providers: [
                { provide: CloudAppEventsService, useValue: mockEventsService },
                { provide: CloudAppRestService, useValue: mockRestService },
                { provide: CloudAppSettingsService, useValue: mockSettingsService },
                { provide: AlertService, useValue: mockAlertService },
                { provide: TranslateService, useValue: mockTranslateService },
                // Wymuszenie dostępności HttpClient dla TranslateModule:
                HttpClient 
            ]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(MainComponent);
        component = fixture.componentInstance;
        restService = TestBed.inject(CloudAppRestService);
        eventsService = TestBed.inject(CloudAppEventsService);

        fixture.detectChanges(); 
        
        // Symulujemy załadowanie strony z encjami
        onPageLoadSubject$.next({ entities: mockEntities });
        fixture.detectChanges();
    });

    // Test 1: Sprawdza, czy komponent się tworzy i ładowane są encje
    it('should create and load entities from events service', () => {
        expect(component).toBeTruthy();
        expect(component.visibleEntities.length).toBe(2);
    });

    // Test 2: Sprawdza, czy generowanie eksportu wywołuje REST API i generuje poprawną treść
    it('should generate file content using forkJoin and selected fields', waitForAsync(() => {
        const restSpy = spyOn(restService, 'call').and.callThrough();
        const alertSuccessSpy = spyOn(mockAlertService, 'success').and.callThrough();
        
        // 1. Symulacja wybrania encji
        component.selectedEntities = mockEntities;
        
        // 2. Wywołanie eksportu
        component.onGenerateExport();
        
        expect(restSpy).toHaveBeenCalledTimes(2);

        fixture.whenStable().then(() => {
            fixture.detectChanges();
            
            // 3. Weryfikacja treści pliku (Nagłówek, Pola, Dane)
            const expectedHeader = '# Test Header\nT:ISBN\tT:Title'; 
            const expectedRow1 = '12345\tTitle 1';
            const expectedRow2 = '67890\tTitle 2';
            
            expect(component.previewContent).toContain(expectedHeader);
            expect(component.previewContent).toContain(expectedRow1);
            expect(component.previewContent).toContain(expectedRow2);
            expect(component.loading).toBeFalse();
            expect(alertSuccessSpy).toHaveBeenCalledWith('T:Main.Alerts.PreviewSuccess');
        });
    }));

    // Test 3: Sprawdza obsługę błędu przy braku wybranych encji
    it('should show warning alert if no entities are selected for export', () => {
        const alertWarnSpy = spyOn(mockAlertService, 'warn').and.callThrough();
        
        // Upewniamy się, że nie ma wybranych encji
        component.selectedEntities = [];
        
        component.onGenerateExport();
        
        // Oczekujemy alertu ostrzegawczego
        expect(alertWarnSpy).toHaveBeenCalledWith('T:Main.Alerts.SelectOne');
        expect(component.previewContent).toBeNull();
    });
});