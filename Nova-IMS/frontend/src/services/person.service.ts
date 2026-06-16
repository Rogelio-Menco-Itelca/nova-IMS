import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
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
}
