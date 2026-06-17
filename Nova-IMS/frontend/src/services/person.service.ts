import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  Person,
  PersonFormPayload,
  CatalogOption,
  DocumentTypeOption,
} from '../models/incident.model';

@Injectable({ providedIn: 'root' })
export class PersonService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/people';

  people = signal<Person[]>([]);
  isLoading = signal(false);

  constructor() {
    this.getPeople();
  }

  getPeople(): void {
    this.isLoading.set(true);
    this.http.get<Person[]>(this.apiUrl).subscribe({
      next: (data) => {
        this.people.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  getPersonRoles(agencyCode: string) {
    return this.http.get<CatalogOption[]>('/api/person-roles', {
      params: { agency: agencyCode },
    });
  }

  getGenders(agencyCode: string) {
    return this.http.get<CatalogOption[]>('/api/genders', {
      params: { agency: agencyCode },
    });
  }

  getDocumentTypes() {
    return this.http.get<DocumentTypeOption[]>('/api/document-types');
  }

  async addPerson(person: PersonFormPayload): Promise<Person> {
    const created = await firstValueFrom(this.http.post<Person>(this.apiUrl, person));
    this.people.update((list) => [created, ...list]);
    return created;
  }

  async updatePerson(id: string, person: PersonFormPayload): Promise<Person> {
    const updated = await firstValueFrom(this.http.put<Person>(`${this.apiUrl}/${id}`, person));
    this.people.update((list) => list.map((p) => (p.id === id ? updated : p)));
    return updated;
  }

  async setPersonStatus(id: string, status: 'Activo' | 'Inactivo'): Promise<Person> {
    const updated = await firstValueFrom(
      this.http.patch<Person>(`${this.apiUrl}/${id}/status`, { status }),
    );
    this.people.update((list) => list.map((p) => (p.id === id ? updated : p)));
    return updated;
  }

  lookupByPhone(phone: string) {
    return this.http.get<Person>(`/api/telephony/lookup/${phone}`);
  }

  lookupRegisteredByPhone(phone: string) {
    const local = this.findRegisteredPerson({ phone });
    if (local) return of(local);
    return this.http
      .get<Person>(`/api/telephony/lookup/${encodeURIComponent(phone)}`)
      .pipe(catchError(() => of(null as unknown as Person)));
  }

  lookupByDocument(documentId: string) {
    const digits = String(documentId || '').replace(/\D/g, '');
    const local = this.findRegisteredPerson({ documentId: digits });
    if (local) return of(local);
    return this.http
      .get<Person>(`/api/people/lookup/document/${encodeURIComponent(digits)}`)
      .pipe(catchError(() => of(null as unknown as Person)));
  }

  /** Catálogo admin: búsqueda local por cédula o teléfono (solo activos). */
  findRegisteredPerson(query: { documentId?: string; phone?: string }): Person | null {
    const normDoc = String(query.documentId ?? '').replace(/\D/g, '');
    const normPhone = this.normalizePhoneDigits(query.phone ?? '');
    if (!normDoc && normPhone.length < 7) return null;

    return (
      this.people().find((person) => {
        if (person.status === 'Inactivo') return false;
        const personDoc = String(person.documentId ?? '').replace(/\D/g, '');
        const personPhone = this.normalizePhoneDigits(person.phone || person.contacto || '');
        if (normDoc && personDoc && personDoc === normDoc) return true;
        if (normPhone.length >= 7 && personPhone && personPhone === normPhone) return true;
        return false;
      }) ?? null
    );
  }

  private normalizePhoneDigits(phone: string): string {
    let digits = String(phone ?? '').replace(/\D/g, '');
    if (digits.startsWith('57') && digits.length > 10) {
      digits = digits.slice(2);
    }
    return digits;
  }
}
