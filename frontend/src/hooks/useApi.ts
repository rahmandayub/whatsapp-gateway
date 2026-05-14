import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import type { ApiResponse } from '../types/api';

export function useApi() {
    const { apiKey, logout } = useAuth();

    const apiCall = useCallback(
        async (
            endpoint: string,
            method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
            body?: object | FormData,
        ): Promise<ApiResponse | null> => {
            const headers: Record<string, string> = {
                'x-api-key': apiKey,
            };

            if (!(body instanceof FormData)) {
                headers['Content-Type'] = 'application/json';
            }

            const config: RequestInit = { method, headers };
            if (body) {
                config.body =
                    body instanceof FormData ? body : JSON.stringify(body);
            }

            try {
                const response = await fetch(`/api/v1${endpoint}`, config);
                const text = await response.text();

                let data: ApiResponse;
                try {
                    data = JSON.parse(text) as ApiResponse;
                } catch {
                    throw new Error(
                        `API returned invalid response (Status: ${response.status})`,
                    );
                }

                if (!response.ok) {
                    if (response.status === 401 || response.status === 403) {
                        logout();
                        throw new Error(
                            'Authentication failed. Please check your API Key.',
                        );
                    }
                    throw new Error(data.message || 'API Error');
                }

                return data;
            } catch (error) {
                const err =
                    error instanceof Error ? error.message : String(error);
                // Don't throw on routine polling endpoints
                if (
                    endpoint.includes('/log') ||
                    endpoint.includes('/sessions')
                ) {
                    return null;
                }
                throw new Error(err, { cause: error });
            }
        },
        [apiKey, logout],
    );

    return apiCall;
}
