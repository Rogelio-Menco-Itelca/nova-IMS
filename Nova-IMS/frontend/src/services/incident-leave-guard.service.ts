import { Injectable } from '@angular/core';

type LeaveCheck = () => boolean;
type LeaveRequest = (continueAction: () => void) => void;

@Injectable({ providedIn: 'root' })
export class IncidentLeaveGuardService {
  private hasPendingChanges: LeaveCheck | null = null;
  private requestConfirmation: LeaveRequest | null = null;

  register(hasPendingChanges: LeaveCheck, requestConfirmation: LeaveRequest): void {
    this.hasPendingChanges = hasPendingChanges;
    this.requestConfirmation = requestConfirmation;
  }

  unregister(): void {
    this.hasPendingChanges = null;
    this.requestConfirmation = null;
  }

  tryLeaveIncidentsView(continueAction: () => void): boolean {
    if (!this.hasPendingChanges?.() || !this.requestConfirmation) {
      continueAction();
      return true;
    }
    this.requestConfirmation(continueAction);
    return false;
  }
}
