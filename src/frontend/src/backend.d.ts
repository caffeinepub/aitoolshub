export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export type Time = bigint;
export type ToolName = string;
export interface UsageEntry {
    usageId: bigint;
    email: string;
    creditsSpent: bigint;
    timestamp: Time;
    toolName: string;
}
export interface FeedbackEntry {
    feedbackId: bigint;
    email: string;
    rating: bigint;
    message: string;
    timestamp: Time;
}
export interface Tool {
    name: ToolName;
    price: bigint;
}
export interface UserProfile {
    username: string;
    email: string;
}
export interface backendInterface {
    _initializeAccessControlWithSecret(secret: string): Promise<void>;
    getAvailableTools(): Promise<Array<Tool>>;
    login(email: string, passwordHash: string): Promise<UserProfile>;
    register(username: string, email: string, passwordHash: string): Promise<void>;
    getCredits(email: string, passwordHash: string): Promise<bigint>;
    useTool(toolName: string, email: string, passwordHash: string): Promise<void>;
    getToolUsageHistory(email: string, passwordHash: string): Promise<Array<UsageEntry>>;
    adminSetCredits(email: string, amount: bigint): Promise<void>;
    getLastDailyCreditTime(): Promise<bigint>;
    submitFeedback(email: string, passwordHash: string, rating: bigint, message: string): Promise<void>;
    getFeedbacks(email: string, passwordHash: string): Promise<Array<FeedbackEntry>>;
}
