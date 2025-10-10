import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatRadioChange } from '@angular/material/radio';
import {
  AlertService,
  CloudAppEventsService,
  CloudAppRestService,
  Entity,
  // Zostawiamy tylko niezbędne typy
} from '@exlibris/exl-cloudapp-angular-lib';
import { TranslateService } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators'; // Tylko tap

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss']
})
export class MainComponent implements OnInit, OnDestroy {

  loading = false;
  // Przywrócona logika wyboru pojedynczej encji
  selectedEntity: Entity | null = null;
  apiResult: any;

  entities$: Observable<Entity[]>;

  constructor(
    private restService: CloudAppRestService,
    private eventsService: CloudAppEventsService,
    private alert: AlertService,
    private translate: TranslateService,
  ) {
    // Subskrypcja encji, która czyści stan po każdej zmianie kontekstu
    this.entities$ = this.eventsService.entities$.pipe(tap(() => this.clear()));
  }

  ngOnInit() {
  }

  ngOnDestroy(): void {
  }

  // Funkcja wywoływana po wybraniu encji (zostawiamy ją, aby HTML działał)
  entitySelected(event: MatRadioChange) {
    const value = event.value as Entity;
    this.loading = true;
    this.restService.call<any>(value.link)
      .subscribe({
        next: result => this.apiResult = result,
        error: error => this.alert.error('Błąd pobierania encji: ' + error.message)
      });
  }

  // Funkcja czyszcząca stan (wybór i wynik API)
  clear() {
    this.apiResult = null;
    this.selectedEntity = null;
  }

  // Usuwamy nieużywane funkcje: update, setLang, tryParseJson
}
