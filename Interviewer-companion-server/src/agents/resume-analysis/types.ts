import type { ResumeExtractionResult } from "../../types/resumeExtractionResult.js";

export interface ResumeAnalysisInput {
    resumeText: string
}

export interface ResumeAnalysisOutput extends ResumeExtractionResult {}