import type { ResumeExtractionResult } from "../../types/resumeExtractionResult.js";

export interface ResumeAnalysisInput {
    resumeText: string
}

export type ResumeAnalysisOutput = ResumeExtractionResult;