import { MedicalSchemeAttributes, MedicalSchemeCreationAttributes, CoverageType } from "../types";
export declare class MedicalSchemeService {
    getAllSchemes(filters: {
        search?: string;
        coverageType?: CoverageType;
        isActive?: boolean;
    }, pagination: {
        page: number;
        limit: number;
        sortBy: string;
        sortOrder: "asc" | "desc";
    }): Promise<{
        schemes: MedicalSchemeAttributes[];
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
    getActiveSchemes(): Promise<MedicalSchemeAttributes[]>;
    getSchemeById(id: string): Promise<MedicalSchemeAttributes | null>;
    createScheme(schemeData: Partial<MedicalSchemeCreationAttributes>): Promise<MedicalSchemeAttributes>;
    updateScheme(id: string, updateData: Partial<MedicalSchemeAttributes>): Promise<MedicalSchemeAttributes | null>;
    deleteScheme(id: string): Promise<boolean>;
    getSchemeSubscribers(schemeId: string, filters: {
        status?: string;
    }, pagination: {
        page: number;
        limit: number;
    }): Promise<{
        subscribers: any[];
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
    private validateSchemeData;
}
//# sourceMappingURL=medicalScheme.service.d.ts.map