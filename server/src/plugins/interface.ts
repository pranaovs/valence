export interface Plugin {
  name: string;
  description: string;
  authenticate(
    credentials: Record<string, string>
  ): Promise<boolean>;
  fetchTodayStatus(
    credentials: Record<string, string>
  ): Promise<{ completed: boolean; metadata: Record<string, any> }>;
  getProgressData(
    credentials: Record<string, string>,
    startDate: string,
    endDate: string
  ): Promise<
    Array<{ date: string; completed: boolean; metadata: Record<string, any> }>
  >;
}
