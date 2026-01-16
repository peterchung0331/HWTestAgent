/**
 * Background Queue Service
 * Memory-based task queue for non-critical async operations
 */

interface QueueTask {
  type: 'SEARCH_SIMILAR_PATTERNS';
  data: {
    patternId: number;
    projectName: string;
    errorMessage: string;
  };
  createdAt: Date;
}

class BackgroundQueueService {
  private queue: Array<QueueTask> = [];
  private processing: boolean = false;
  private failedTasks: Array<QueueTask & { error: string }> = [];

  /**
   * Add task to queue (non-blocking)
   */
  async addTask(task: Omit<QueueTask, 'createdAt'>): Promise<void> {
    this.queue.push({
      ...task,
      createdAt: new Date()
    });

    // Start processing if not already running
    this.processQueue().catch(err => {
      console.error('❌ Background queue processing error:', err);
    });
  }

  /**
   * Process queue sequentially
   */
  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    try {
      while (this.queue.length > 0) {
        const task = this.queue.shift();
        if (!task) continue;

        try {
          await this.executeTask(task);
        } catch (error) {
          console.error(`❌ Task execution failed (${task.type}):`, error);
          this.failedTasks.push({
            ...task,
            error: error instanceof Error ? error.message : 'Unknown error'
          });

          // Keep only last 100 failed tasks
          if (this.failedTasks.length > 100) {
            this.failedTasks.shift();
          }
        }
      }
    } finally {
      this.processing = false;
    }
  }

  /**
   * Execute a single task
   */
  private async executeTask(task: QueueTask): Promise<void> {
    switch (task.type) {
      case 'SEARCH_SIMILAR_PATTERNS':
        await this.searchSimilarPatterns(task.data);
        break;
      default:
        console.warn(`⚠️ Unknown task type: ${task.type}`);
    }
  }

  /**
   * Search for similar error patterns (async background job)
   */
  private async searchSimilarPatterns(data: {
    patternId: number;
    projectName: string;
    errorMessage: string;
  }): Promise<void> {
    const ErrorPatternRepository = (await import('../storage/repositories/ErrorPatternRepository.js')).default;

    // Extract keywords from error message (first 100 chars)
    const query = data.errorMessage.substring(0, 100).trim();

    const similarPatterns = await ErrorPatternRepository.searchErrorPatterns({
      query,
      project: data.projectName,
      limit: 5
    });

    // Filter out the current pattern itself
    const filtered = similarPatterns.filter(p => p.id !== data.patternId);

    if (filtered.length > 0) {
      console.log(`🔍 Found ${filtered.length} similar patterns for pattern ${data.patternId}`);
    }
  }

  /**
   * Get queue status (for monitoring)
   */
  getStatus(): {
    queue_length: number;
    processing: boolean;
    failed_tasks_count: number;
  } {
    return {
      queue_length: this.queue.length,
      processing: this.processing,
      failed_tasks_count: this.failedTasks.length
    };
  }

  /**
   * Get failed tasks (for debugging)
   */
  getFailedTasks(): Array<QueueTask & { error: string }> {
    return [...this.failedTasks];
  }

  /**
   * Clear failed tasks
   */
  clearFailedTasks(): void {
    this.failedTasks = [];
  }
}

export default new BackgroundQueueService();
