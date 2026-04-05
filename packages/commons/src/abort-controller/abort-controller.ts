/**
 * Utility class for managing AbortController with timeout functionality.
 * This class encapsulates the creation and management of AbortController instances
 * with automatic timeout handling for gRPC calls.
 */
export class TimeoutAbortController {
  private abortController: AbortController;
  private timeoutId: NodeJS.Timeout | null = null;
  private abortListener: (() => void) | null = null;

  /**
   * Creates a new TimeoutAbortController instance.
   */
  constructor() {
    this.abortController = new AbortController();

    // Set up a listener to automatically clear the timeout when abort is triggered
    this.abortListener = () => this.clearTimeout();
    this.abortController.signal.addEventListener("abort", this.abortListener);
  }

  /**
   * Sets a timeout after which the abort controller will automatically abort.
   *
   * @param timeoutMs - The timeout in milliseconds after which to abort
   * @returns The signal from the AbortController for use in gRPC calls
   */
  public setTimeout(timeoutMs: number): AbortSignal {
    // Clear any existing timeout to prevent memory leaks
    this.clearTimeout();

    // Set a new timeout
    this.timeoutId = setTimeout(() => this.abortController.abort(), timeoutMs);

    return this.abortController.signal;
  }

  /**
   * Clears the timeout to prevent memory leaks.
   * This is automatically called when the abort event is triggered,
   * but can also be called manually if needed.
   */
  public clearTimeout(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  /**
   * Gets the signal from the AbortController.
   * Use this if you want to get the signal without setting a timeout.
   */
  public get signal(): AbortSignal {
    return this.abortController.signal;
  }

  /**
   * Manually aborts the controller.
   * This will automatically clear any active timeout.
   */
  public abort(): void {
    this.abortController.abort();
  }

  /**
   * Releases all resources associated with this controller.
   * This should be called when the controller is no longer needed.
   */
  public dispose(): void {
    this.clearTimeout();

    // Remove the abort event listener to prevent memory leaks
    if (this.abortListener) {
      this.abortController.signal.removeEventListener(
        "abort",
        this.abortListener
      );
      this.abortListener = null;
    }
  }

  /**
   * Creates a new TimeoutAbortController, sets a timeout, and returns the signal.
   * This is a convenience method for one-off use cases.
   *
   * @param timeoutMs - The timeout in milliseconds after which to abort
   * @returns An object containing the controller and its signal
   *
   * @remarks
   * The returned controller will automatically clear its timeout when the abort event is triggered.
   * However, to fully release resources, call controller.dispose() when you're done with it.
   *
   * Example usage:
   * ```
   * const { controller, signal } = TimeoutAbortController.withTimeout(5000);
   * try {
   *   await someAsyncOperation({ signal });
   * } finally {
   *   controller.dispose(); // Ensure resources are cleaned up
   * }
   * ```
   */
  public static withTimeout(timeoutMs: number): {
    controller: TimeoutAbortController;
    signal: AbortSignal;
  } {
    const controller = new TimeoutAbortController();
    const signal = controller.setTimeout(timeoutMs);
    return { controller, signal };
  }
}
