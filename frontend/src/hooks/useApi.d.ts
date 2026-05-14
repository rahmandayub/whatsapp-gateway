import type { ApiResponse } from '../types/api';
export declare function useApi(): (endpoint: string, method?: "GET" | "POST" | "PUT" | "DELETE", body?: object | FormData) => Promise<ApiResponse | null>;
