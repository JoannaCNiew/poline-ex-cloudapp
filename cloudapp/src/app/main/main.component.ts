import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatRadioChange } from '@angular/material/radio';
import {
  AlertService,
  CloudAppEventsService,
  CloudAppRestService,
  Entity,
  HttpMethod,
  Request,
  RestErrorResponse
} from '@exlibris/exl-cloudapp-angular-lib';
import { TranslateService } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { finalize, tap } from 'rxjs/operators';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss']
})
export class MainComponent implements OnInit, OnDestroy {

  loading = false;
  selectedEntity: Entity | null = null;
  apiResult: any;

  entities$: Observable<Entity[]>;

  constructor(
    private restService: CloudAppRestService,
    private eventsService: CloudAppEventsService,
    private alert: AlertService,
    private translate: TranslateService,
  ) {
    this.entities$ = this.eventsService.entities$.pipe(tap(() => this.clear()));
  }

  ngOnInit() {
  }

  ngOnDestroy(): void {
  }

  entitySelected(event: MatRadioChange) {
    const value = event.value as Entity;
    this.loading = true;
    this.restService.call<any>(value.link)
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: result => this.apiResult = result,
        error: error => this.alert.error('Failed to retrieve entity: ' + error.message)
      });
  }

  clear() {
    this.apiResult = null;
    this.selectedEntity = null;
  }

  update(value: any) {
    const requestBody = this.tryParseJson(value)
    if (!requestBody) return this.alert.error('Failed to parse json');

    this.loading = true;
    let request: Request = {
      url: this.selectedEntity!.link,
      method: HttpMethod.PUT,
      requestBody
    };
    this.restService.call(request)
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: result => {
          this.apiResult = result;
          this.eventsService.refreshPage().subscribe(
            () => this.alert.success('Success!')
          );
        },
        error: (e: RestErrorResponse) => {
          this.alert.error('Failed to update data: ' + e.message);
          console.error(e);
        }
      });
  }

  setLang(lang: string) {
    this.translate.use(lang);
  }

  private tryParseJson(value: any) {
    try {
      return JSON.parse(value);
    } catch (e) {
      console.error(e);
    }
    return undefined;
  }
}