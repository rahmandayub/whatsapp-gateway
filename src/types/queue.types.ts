import { Job } from 'bullmq';

export interface QueueJob extends Job {
    data: any;
}
