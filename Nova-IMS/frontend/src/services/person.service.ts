import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Person } from '../models/incident.model';
import { SocketService } from './socket.service';

@Injectable({ providedIn: 'root' })
export class PersonService {
  private http = inject(HttpClient);
  private socketService = inject(SocketService);
  private apiUrl = '/api/people';

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
      error: () => this.isLoading.set(false)
    });
  }

  addPerson(person: Omit<Person, 'id' | 'createdAt'>): void {
    this.http.post<Person>(this.apiUrl, person).subscribe({
      next: (newPerson) => {
        this.people.update(list => [newPerson, ...list]);
      }
    });
  }

  updatePerson(id: string, person: Partial<Person>): void {
    this.http.put<Person>(`${this.apiUrl}/${id}`, person).subscribe({
      next: (updated) => {
        this.people.update(list => list.map(p => p.id === id ? updated : p));
      }
    });
  }

  deletePerson(id: string): void {
    this.http.delete(`${this.apiUrl}/${id}`).subscribe({
      next: () => {
        this.people.update(list => list.filter(p => p.id !== id));
      }
    });
  }

  lookupByPhone(phone: string) {
    return this.http.get<Person>(`/api/telephony/lookup/${phone}`);
  }
}
