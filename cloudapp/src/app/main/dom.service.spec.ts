import { TestBed } from '@angular/core/testing';
import { DomService } from './dom.service';

describe('DomService', () => {
  let service: DomService;
  let mockNativeElement: HTMLElement;
  let mockSelectEntities: HTMLElement;
  let mockLabel: HTMLElement;

  // ★★★ NOWY ELEMENT ★★★
  let mockMatCheckbox: HTMLElement; 

  // Będziemy szpiegować konsolę, aby sprawdzić, czy są wywoływane ostrzeżenia
  let warnSpy: jasmine.Spy;
  let logSpy: jasmine.Spy;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DomService]
    });
    service = TestBed.inject(DomService);

    // 1. Tworzymy fałszywą strukturę DOM w pamięci
    mockNativeElement = document.createElement('div');
    mockSelectEntities = document.createElement('eca-select-entities');
    
    // ★★★ POPRAWKA: Budujemy poprawną strukturę z <mat-checkbox> ★★★
    mockMatCheckbox = document.createElement('mat-checkbox'); 
    mockLabel = document.createElement('span'); // Element, który będziemy modyfikować
    
    // 2. Składamy elementy w całość
    // Struktura: <div> <eca-select-entities> <mat-checkbox> <span> </mat-checkbox> </eca-select-entities> </div>
    mockMatCheckbox.appendChild(mockLabel);
    mockSelectEntities.appendChild(mockMatCheckbox);
    mockNativeElement.appendChild(mockSelectEntities);

    // 3. Szpiegujemy 'console'
    warnSpy = spyOn(console, 'warn').and.stub();
    logSpy = spyOn(console, 'log').and.stub();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should update label using primary selector (.mdc-checkbox__label)', () => {
    mockLabel.className = 'mdc-checkbox__label'; // Ustawiamy klasę, której szuka serwis
    const text = 'Zaznacz wszystko';
    
    service.updateSelectAllCheckboxLabel(mockNativeElement, text);

    // Sprawdzamy, czy tekst został poprawnie wstawiony i pogrubiony
    expect(mockLabel.innerHTML).toBe('<b>Zaznacz wszystko</b>');
    expect(logSpy).toHaveBeenCalledWith('DomService: Checkbox label updated.');
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('should update label using fallback selector (label)', () => {
    // Tym razem mockLabel nie ma klasy '.mdc-checkbox__label'
    // Zmieniamy go na tag <label>, aby przetestować fallback
    const fallbackLabel = document.createElement('label');
    
    // ★★★ POPRAWKA: Czyścimy stary element i budujemy poprawną strukturę ★★★
    mockMatCheckbox.innerHTML = ''; // Czyścimy stary <span.
    mockMatCheckbox.appendChild(fallbackLabel); // Dodajemy <label> do <mat-checkbox>

    const text = 'Wybierz';
    service.updateSelectAllCheckboxLabel(mockNativeElement, text);

    // Sprawdzamy, czy fallback zadziałał
    expect(fallbackLabel.innerHTML).toBe('<b>Wybierz</b>');
    expect(logSpy).toHaveBeenCalled();
  });

  it('should not update if label innerHTML is already correct', () => {
    mockLabel.className = 'mdc-checkbox__label';
    const text = 'Identyczny Tekst';
    mockLabel.innerHTML = '<b>Identyczny Tekst</b>'; // Ustawiamy tekst z góry

    service.updateSelectAllCheckboxLabel(mockNativeElement, text);

    // Serwis nie powinien nic robić ani logować
    expect(logSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('should warn if eca-select-entities is not found', () => {
    const emptyElement = document.createElement('div'); // Pusty element, bez 'eca-select-entities'
    service.updateSelectAllCheckboxLabel(emptyElement, 'Test');
    
    expect(warnSpy).toHaveBeenCalledWith('DomService: Could not find the eca-select-entities element.');
  });
  
  it('should warn if label element is not found', () => {
    mockMatCheckbox.innerHTML = ''; // Usuwamy etykietę ze środka
    service.updateSelectAllCheckboxLabel(mockNativeElement, 'Test');
    
    expect(warnSpy).toHaveBeenCalledWith('DomService: Could not find the select all checkbox label element.');
  });

  it('should warn if nativeElement or text is not provided', () => {
    // Test dla braku elementu
    service.updateSelectAllCheckboxLabel(null as any, 'Test');
    expect(warnSpy).toHaveBeenCalledWith('DomService: NativeElement or translatedText not provided.');
    
    warnSpy.calls.reset(); // Resetujemy szpiega
    
    // Test dla braku tekstu
    service.updateSelectAllCheckboxLabel(mockNativeElement, '');
    expect(warnSpy).toHaveBeenCalledWith('DomService: NativeElement or translatedText not provided.');
  });

});