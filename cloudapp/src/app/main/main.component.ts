import { Component, OnDestroy, OnInit } from '@angular/core';
import {
  AlertService,
  CloudAppEventsService,
  CloudAppRestService,
  Entity,
  HttpMethod,
} from '@exlibris/exl-cloudapp-angular-lib';
import { Observable, forkJoin } from 'rxjs'; // Dodajemy forkJoin do multi-select
import { finalize, tap, map } from 'rxjs/operators'; 
import { TranslateService } from '@ngx-translate/core'; // Przywracamy TranslateService

// --- INTERFEJS DANYCH EKSPORTOWYCH ---
// (Przydatne, aby odseparować logikę aplikacji)
interface PoExportData {
  isbn: string;
  quantity: number;
}
// --- KONIEC INTERFEJSU ---

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss']
})
export class MainComponent implements OnInit, OnDestroy {

  window: Window = window; // Dla bezpiecznego użycia w kopowaniu
  loading = false;
  apiResult: any; // Pozostawiamy dla kompatybilności z bazowym HTML, ale nie jest używane
  
  // KLUCZOWE ZMIENNE DLA MULTI-SELECT:
  visibleEntities: Entity[] = []; // Encje z kontekstu Almy
  selectedEntities: Entity[] = []; // Encje zaznaczone przez użytkownika
  previewContent: string | null = null; // Zawartość pliku do podglądu
  
  entities$: Observable<Entity[]>;
  public alert: AlertService; // Zmienione na public dla dostępu w HTML

  constructor(
    private restService: CloudAppRestService,
    private eventsService: CloudAppEventsService,
    alert: AlertService, 
    private translate: TranslateService, // Zostawiamy translate, jeśli jest w bazowej wersji
  ) {
    this.alert = alert; 
    
    // Subskrypcja ODBIERA listę WIDOCZNYCH encji, a nie tylko wybranych
    this.entities$ = this.eventsService.entities$.pipe(
      tap(entities => {
        this.loading = false;
        // Ustawiamy listę encji, które są dostępne do wyboru w CloudApp
        this.visibleEntities = entities || []; 
        // Czyścimy WYBRANE encje, gdy zmienia się kontekst (np. przechodzimy na inną stronę)
        this.selectedEntities = [];
        this.previewContent = null;
      })
    );
  }

  ngOnInit() { }
  ngOnDestroy(): void { }

  // --- LOGIKA MULTI-SELECT (ODTWORENIE Z KODU INSPIRUJĄCEGO) ---
  
  isAllSelected(entities: Entity[]): boolean {
    if (!entities || entities.length === 0) return false;
    // Sprawdzamy, czy każda widoczna encja jest na liście wybranych
    return entities.every(entity => this.selectedEntities.some(e => e.link === entity.link));
  }

  masterToggle(entities: Entity[]) {
    const isAll = this.isAllSelected(entities);
    // Jeśli wszystkie są wybrane -> odznacz, w przeciwnym razie -> zaznacz wszystkie
    this.selectedEntities = isAll ? [] : [...entities];
  }

  toggleEntity(entity: Entity) {
    const index = this.selectedEntities.findIndex(e => e.link === entity.link);
    if (index === -1) {
      this.selectedEntities.push(entity);
    } else {
      this.selectedEntities.splice(index, 1);
    }
  }

  isSelected(entity: Entity): boolean {
    return this.selectedEntities.some(e => e.link === entity.link);
  }
  
  // --- FUNKCJONALNOŚĆ BAZOWA USUNIĘTA (clear, entitySelected, update) ---
  // Musimy tylko odtworzyć minimalne funkcje do czyszczenia i ustawiania języka:
  
  clear() {
    // Odświeżona funkcja clear do obsługi multi-select
    this.selectedEntities = [];
    this.previewContent = null;
    this.apiResult = null;
  }
  
  setLang(lang: string) {
    this.translate.use(lang);
  }
  
  // Usunięto: entitySelected, update, tryParseJson (ponieważ nie są częścią eksportu)

  // --- LOGIKA EKSPORTU (ZASLEPIONA NA RAZIE, WYWOŁYwana z HTML) ---

  generatePreview() {
    if (this.selectedEntities.length === 0) {
      this.alert.warn('Wybierz co najmniej jedną linię zamówienia do przetworzenia.');
      return;
    }

    this.loading = true;
    
    // TYMCZASOWY ZASLEP: Logika pobierania i przetwarzania będzie tutaj:
    this.previewContent = `Eksport wygenerowany dla ${this.selectedEntities.length} encji.\n\nISBN\tQuantity\n1234567890\t1`;
    this.loading = false;
    this.alert.success('Podgląd generowania...');
  }
  
  // Metoda do pobierania pliku (bez zmian)
  downloadFile() {
    if (!this.previewContent) {
      this.alert.error('Brak zawartości do pobrania. Najpierw wygeneruj podgląd.');
      return;
    }

    const blob = new Blob([this.previewContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'po_line_export.txt';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    this.alert.success('Plik TXT został pobrany!');
  }

  // Metoda do kopiowania (rozwiązanie błędu TS)
  copyToClipboard(textArea: HTMLTextAreaElement) {
    if (!this.previewContent) {
      this.alert.error('Brak zawartości do skopiowania. Najpierw wygeneruj podgląd.');
      return;
    }
    textArea.select();
    this.window.document.execCommand('copy');
    this.alert.success('Zawartość została skopiowana do schowka!');
  }

}
