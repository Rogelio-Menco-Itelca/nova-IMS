import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { firstValueFrom } from "rxjs";
import {
  ColombiaDepartment,
  ColombiaMunicipality,
} from "../models/incident.model";

@Injectable({ providedIn: "root" })
export class ColombiaGeoService {
  private http = inject(HttpClient);

  private departmentsCache: ColombiaDepartment[] | null = null;

  async getDepartments(): Promise<ColombiaDepartment[]> {
    if (this.departmentsCache?.length) {
      return this.departmentsCache;
    }
    const rows = await firstValueFrom(
      this.http.get<ColombiaDepartment[]>("/api/departments"),
    );
    this.departmentsCache = rows;
    return rows;
  }

  getMunicipalities(departmentId: number) {
    return this.http.get<ColombiaMunicipality[]>("/api/municipalities", {
      params: { departmentId: String(departmentId) },
    });
  }
}
